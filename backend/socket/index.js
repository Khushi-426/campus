import jwt from 'jsonwebtoken';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

/**
 * Why Socket.io instead of polling the REST API every few seconds:
 * polling means every open chat window fires a request on a timer whether
 * or not there's anything new, which wastes requests and adds up to
 * seconds of avoidable latency per message. A persistent WebSocket lets
 * the server push a message the instant it's written, so buyer <-> seller
 * latency is bounded by DB write time (~ms) instead of the poll interval.
 *
 * Scaling note: this single in-process `io` instance works for one server.
 * To run multiple instances behind a load balancer, plug in
 * `@socket.io/redis-adapter` so a message emitted on instance A also
 * reaches a socket connected to instance B (rooms are then backed by
 * Redis pub/sub instead of local memory).
 */
export default function initSocket(io) {
  // Authenticate the socket handshake using the same JWT as the REST API.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token provided'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.name} (${socket.id})`);

    // Client joins the room for each conversation it wants live updates for.
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Buyer or seller sends a chat message.
    socket.on('send_message', async ({ conversationId, text }, ack) => {
      try {
        if (!text || !text.trim()) return ack?.({ error: 'Message cannot be empty' });

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return ack?.({ error: 'Conversation not found' });

        const isParticipant =
          String(conversation.buyer) === String(socket.user._id) ||
          String(conversation.seller) === String(socket.user._id);
        if (!isParticipant) return ack?.({ error: 'Not authorized' });

        const message = await Message.create({
          conversation: conversationId,
          sender: socket.user._id,
          text: text.trim(),
          readBy: [socket.user._id],
        });

        conversation.lastMessage = text.trim();
        conversation.lastMessageAt = new Date();
        await conversation.save();

        const populated = await message.populate('sender', 'name');

        // Push to everyone in the room (both tabs of buyer & seller if open).
        io.to(`conversation:${conversationId}`).emit('new_message', populated);
        ack?.({ success: true, message: populated });
      } catch (err) {
        ack?.({ error: 'Failed to send message' });
      }
    });

    // Lightweight typing indicator - not persisted, just relayed live.
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing', {
        userId: socket.user._id,
        name: socket.user.name,
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user?.name} (${socket.id})`);
    });
  });
}
