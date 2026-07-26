import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = fs.existsSync(path.resolve('backend/.env'))
  ? path.resolve('backend/.env')
  : fs.existsSync(path.resolve('.env'))
  ? path.resolve('.env')
  : path.resolve(process.cwd(), '.env');

dotenv.config({ path: envPath });

import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIo } from 'socket.io-client';
import connectDB from '../../config/db.js';

import initSocket from '../../socket/index.js';
import Conversation from '../../models/Conversation.js';
import User from '../../models/User.js';
import Message from '../../models/Message.js';
import jwt from 'jsonwebtoken';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

export async function runChatBenchmark() {
  console.log('[SOCKET.IO CHAT BENCHMARK] Measuring performance across 1, 10, 50, 100 concurrent users...');
  await connectDB();
  initSocket(io);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const conv = await Conversation.findOne().populate('buyer seller');
  if (!conv) throw new Error('No conversation thread found to benchmark');

  const buyerUser = conv.buyer;
  const token = jwt.sign({ id: buyerUser._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

  const userCounts = [1, 10, 50, 100];
  const userResults = [];

  for (const userCount of userCounts) {
    console.log(`  -> Simulating ${userCount} concurrent Socket.io clients...`);

    let reconnectCount = 0;
    let droppedCount = 0;
    const latencies = [];

    // Connect userCount client sockets in parallel
    const connectPromises = Array.from({ length: userCount }, () => {
      return new Promise((resolve) => {
        const clientSocket = ClientIo(`http://localhost:${port}`, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 3,
        });

        clientSocket.on('reconnect', () => reconnectCount++);
        clientSocket.on('connect_error', () => droppedCount++);

        clientSocket.on('connect', () => {
          clientSocket.emit('join_conversation', conv._id.toString());
          resolve(clientSocket);
        });
      });
    });

    const clients = await Promise.all(connectPromises);

    // Send 2 messages per client with 10s timeout and small 2ms stagger
    const sendPromises = [];
    let totalSent = 0;
    let totalReceived = 0;

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      for (let m = 0; m < 2; m++) {
        totalSent++;
        const promiseIndex = i * 2 + m;
        sendPromises.push(
          new Promise((res) => {
            setTimeout(() => {
              const start = Date.now();
              const timer = setTimeout(() => {
                droppedCount++;
                res();
              }, 10000);

              client.emit(
                'send_message',
                {
                  conversationId: conv._id.toString(),
                  text: `Bench test msg conc=${userCount} client=${i} idx=${m}`,
                },
                (ackRes) => {
                  clearTimeout(timer);
                  const duration = Date.now() - start;
                  if (ackRes?.success) {
                    latencies.push(duration);
                    totalReceived++;
                  } else {
                    droppedCount++;
                  }
                  res();
                }
              );
            }, promiseIndex * 2);
          })
        );
      }
    }

    await Promise.all(sendPromises);

    // Clean up connections
    clients.forEach((c) => c.close());

    latencies.sort((a, b) => a - b);
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;
    const successRate = totalSent > 0 ? Math.round((totalReceived / totalSent) * 100 * 10) / 10 : 100;

    userResults.push({
      concurrentUsers: userCount,
      messagesSent: totalSent,
      messagesReceived: totalReceived,
      avgLatencyMs: avgLatency,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      droppedMessages: droppedCount,
      reconnects: reconnectCount,
      deliverySuccessRatePercent: successRate,
    });
  }

  // Clean up benchmark messages from collection
  await Message.deleteMany({ text: { $regex: /^Bench test msg/ } });

  server.close();

  // Baseline 1-user WebSocket latency for polling comparison
  const baselineWsLatency = userResults[0].avgLatencyMs || 5;

  const pollingIntervals = [1000, 2000, 5000];
  const pollingComparison = pollingIntervals.map((interval) => ({
    pollIntervalMs: interval,
    simulatedAverageLatencyMs: Math.round(interval / 2 + baselineWsLatency),
    latencyOverheadMs: Math.round(interval / 2),
  }));

  const results = {
    websocketScaling: userResults,
    wsVsPolling: {
      baselineWsLatencyMs: baselineWsLatency,
      pollingModes: pollingComparison,
    },
  };

  const resultsDir = path.join(process.cwd(), 'scripts', 'bench', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(resultsDir, 'artillery.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(resultsDir, 'socket_bench.json'), JSON.stringify(results, null, 2));
  console.log('[SOCKET.IO CHAT BENCHMARK] Finished. Saved to scripts/bench/results/artillery.json');
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('benchmark_chat.js')) {
  runChatBenchmark().catch(console.error);
}
