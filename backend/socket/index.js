import jwt from 'jsonwebtoken';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

export default function initSocket(io) {
  // Authenticate socket handshake using JWT
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

    // Join personal user room for direct notifications and unread badges
    const userRoom = `user:${socket.user._id.toString()}`;
    socket.join(userRoom);

    // Join specific chat room
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Send chat message
    socket.on('send_message', async ({ conversationId, text }, ack) => {
      try {
        if (!text || !text.trim()) return ack?.({ error: 'Message cannot be empty' });

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return ack?.({ error: 'Conversation not found' });

        const isBuyer = String(conversation.buyer) === String(socket.user._id);
        const isSeller = String(conversation.seller) === String(socket.user._id);
        if (!isBuyer && !isSeller) return ack?.({ error: 'Not authorized' });

        const recipientId = isBuyer ? conversation.seller.toString() : conversation.buyer.toString();

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

        // Broadcast to current conversation room
        io.to(`conversation:${conversationId}`).emit('new_message', populated);

        // Broadcast real-time notification alert to recipient's personal user room
        io.to(`user:${recipientId}`).emit('chat_notification', {
          conversationId,
          senderName: socket.user.name,
          text: text.trim(),
        });

        ack?.({ success: true, message: populated });
      } catch (err) {
        console.error('Send message error:', err);
        ack?.({ error: 'Failed to send message' });
      }
    });

    // Typing indicator
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
