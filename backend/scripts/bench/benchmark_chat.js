import 'dotenv/config';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIo } from 'socket.io-client';
import connectDB from '../../config/db.js';
import initSocket from '../../socket/index.js';
import Conversation from '../../models/Conversation.js';
import User from '../../models/User.js';
import jwt from 'jsonwebtoken';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

export async function runChatBenchmark() {
  console.log('--- 4. WEBSOCKETS VS POLLING BENCHMARK ---');
  await connectDB();
  initSocket(io);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const conv = await Conversation.findOne().populate('buyer seller');
  if (!conv) throw new Error('No conversation thread found to benchmark');

  const senderUser = conv.buyer;
  const token = jwt.sign({ id: senderUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 1. Socket.io WebSocket Roundtrip Latency
  const clientSocket = ClientIo(`http://localhost:${port}`, {
    auth: { token },
  });

  await new Promise((resolve) => clientSocket.on('connect', resolve));
  clientSocket.emit('join_conversation', conv._id.toString());

  const websocketLatencies = [];
  const totalRuns = 5;

  for (let i = 0; i < totalRuns; i++) {
    const sendTime = Date.now();
    await new Promise((resolve) => {
      const handler = (msg) => {
        const duration = Date.now() - sendTime;
        websocketLatencies.push(duration);
        clientSocket.off('new_message', handler);
        resolve();
      };
      clientSocket.on('new_message', handler);
      clientSocket.emit('send_message', {
        conversationId: conv._id.toString(),
        text: `Benchmark WS test message ${i + 1}`,
      });
    });
  }

  clientSocket.close();
  server.close();

  const avgWsLatency = Math.round(websocketLatencies.reduce((a, b) => a + b, 0) / websocketLatencies.length);

  // 2. Simulated Polling Latency Comparisons
  // Expected average wait time for a polling interval of P is P / 2 + DB Write Time
  const pollingIntervals = [1000, 2000, 5000];
  const pollingResults = pollingIntervals.map((interval) => ({
    pollIntervalMs: interval,
    averageLatencyMs: Math.round(interval / 2 + avgWsLatency),
  }));

  const results = {
    websocketAverageLatencyMs: avgWsLatency,
    simulatedPolling: pollingResults,
  };

  console.log('Chat Benchmark Results:', JSON.stringify(results, null, 2));
  return results;
}

if (process.argv[1].endsWith('benchmark_chat.js')) {
  runChatBenchmark().catch(console.error);
}
