import 'dotenv/config';
import http from 'http';
import express from 'express';
import dns from 'dns';
import { Server } from 'socket.io';
import { io as ClientIo } from 'socket.io-client';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import initSocket from '../socket/index.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function testTwoUserChat() {
  console.log('====================================================');
  console.log('TESTING TWO-PLAYER REAL-TIME SOCKET CHAT & NOTIFICATIONS');
  console.log('====================================================\n');

  await mongoose.connect(process.env.MONGO_URI);

  // 1. Get User A and User B
  const users = await User.find().limit(2);
  if (users.length < 2) throw new Error('At least 2 users required in DB for testing');

  const userA = users[0];
  const userB = users[1];

  console.log(`User A (Buyer): ${userA.name} (${userA._id})`);
  console.log(`User B (Seller): ${userB.name} (${userB._id})`);

  // 2. Find a Product owned by User B or User A
  let sampleProduct = await Product.findOne({ seller: userB._id });
  if (!sampleProduct) {
    sampleProduct = await Product.create({
      title: 'Automated Socket Test Calculator',
      description: 'Testing two-person chat',
      category: 'calculator',
      price: 500,
      condition: 'good',
      seller: userB._id,
    });
  }

  // 3. Create or find Conversation Thread
  let conv = await Conversation.findOne({ product: sampleProduct._id, buyer: userA._id });
  if (!conv) {
    conv = await Conversation.create({
      product: sampleProduct._id,
      buyer: userA._id,
      seller: userB._id,
    });
  }

  const convIdStr = conv._id.toString();
  console.log(`Conversation ID: ${convIdStr}`);

  // 4. Initialize Express HTTP + Socket.io Server
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  initSocket(io);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const tokenA = jwt.sign({ id: userA._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const tokenB = jwt.sign({ id: userB._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 5. Connect Client Socket A (User A) and Client Socket B (User B)
  const socketA = ClientIo(`http://localhost:${port}`, { auth: { token: tokenA } });
  const socketB = ClientIo(`http://localhost:${port}`, { auth: { token: tokenB } });

  await Promise.all([
    new Promise((res) => socketA.on('connect', res)),
    new Promise((res) => socketB.on('connect', res)),
  ]);

  console.log('✓ Both Socket A (User A) and Socket B (User B) connected and authenticated successfully.');

  // User A and User B join conversation room
  socketA.emit('join_conversation', convIdStr);
  socketB.emit('join_conversation', convIdStr);

  // Track received messages and notifications
  const userAReceived = [];
  const userBReceived = [];
  const userBNotifications = [];

  socketA.on('new_message', (msg) => userAReceived.push(msg));
  socketB.on('new_message', (msg) => userBReceived.push(msg));
  socketB.on('chat_notification', (notif) => userBNotifications.push(notif));

  // 6. User A sends message -> User B
  const messageAText = `Hello ${userB.name}, is the ${sampleProduct.title} still available?`;
  console.log(`User A emitting message: "${messageAText}"`);

  await new Promise((resolve) => {
    socketA.emit('send_message', { conversationId: convIdStr, text: messageAText }, (ack) => {
      console.log('Ack A:', ack);
      resolve();
    });
  });

  // Give socket events 500ms to propagate
  await new Promise((r) => setTimeout(r, 500));

  // 7. User B sends reply -> User A
  const messageBText = `Hi ${userA.name}! Yes, it is available for pickup tomorrow.`;
  console.log(`User B emitting message: "${messageBText}"`);

  await new Promise((resolve) => {
    socketB.emit('send_message', { conversationId: convIdStr, text: messageBText }, (ack) => {
      console.log('Ack B:', ack);
      resolve();
    });
  });

  await new Promise((r) => setTimeout(r, 500));

  // 8. Assertions and Verification
  socketA.close();
  socketB.close();
  server.close();

  const testPassed =
    userBReceived.some((m) => m.text === messageAText) &&
    userAReceived.some((m) => m.text === messageBText);

  console.log('\n--- VERIFICATION RESULTS ---');
  console.log(`User B received User A's message: ${userBReceived.length > 0 ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`User A received User B's reply: ${userAReceived.length > 0 ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`User B received real-time chat notification: ${userBNotifications.length > 0 ? '✓ PASS' : '❌ FAIL'}`);
  console.log(`Overall Two-User Chat Integration Test: ${testPassed ? '✅ ALL PASSED' : '❌ FAILED'}`);

  await mongoose.disconnect();
  process.exit(testPassed ? 0 : 1);
}

testTwoUserChat().catch((err) => {
  console.error('Chat test error:', err);
  process.exit(1);
});
