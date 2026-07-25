import 'dotenv/config';
import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import connectDB from '../../config/db.js';
import productRoutes from '../../routes/productRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/products', productRoutes);

function fireConcurrentRequests(url, count) {
  const promises = Array.from({ length: count }, () => {
    return new Promise((resolve) => {
      const start = Date.now();
      const req = http.get(url, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve(Date.now() - start));
      });
      req.on('error', () => resolve(Date.now() - start));
    });
  });
  return Promise.all(promises);
}

export async function runPoolingBenchmark() {
  console.log('--- 5. CONNECTION POOLING BENCHMARK ---');

  // Test 1: With Connection Pool (maxPoolSize = 10)
  await connectDB({ maxPoolSize: 10, minPoolSize: 2 });
  const server1 = app.listen(0);
  const port1 = server1.address().port;
  const url1 = `http://localhost:${port1}/api/products?nocache=1`;

  const start1 = Date.now();
  const latenciesPool10 = await fireConcurrentRequests(url1, 50);
  const totalDuration1 = Date.now() - start1;

  server1.close();
  await mongoose.disconnect();

  latenciesPool10.sort((a, b) => a - b);
  const p50Pool10 = latenciesPool10[Math.floor(latenciesPool10.length * 0.5)];
  const p99Pool10 = latenciesPool10[Math.floor(latenciesPool10.length * 0.99)];
  const reqPerSec10 = Math.round((50 / totalDuration1) * 1000);

  // Test 2: Constrained Connection Pool (maxPoolSize = 1)
  await connectDB({ maxPoolSize: 1, minPoolSize: 1 });
  const server2 = app.listen(0);
  const port2 = server2.address().port;
  const url2 = `http://localhost:${port2}/api/products?nocache=1`;

  const start2 = Date.now();
  const latenciesPool1 = await fireConcurrentRequests(url2, 50);
  const totalDuration2 = Date.now() - start2;

  server2.close();
  await mongoose.disconnect();

  latenciesPool1.sort((a, b) => a - b);
  const p50Pool1 = latenciesPool1[Math.floor(latenciesPool1.length * 0.5)];
  const p99Pool1 = latenciesPool1[Math.floor(latenciesPool1.length * 0.99)];
  const reqPerSec1 = Math.round((50 / totalDuration2) * 1000);

  const results = {
    poolSize10: {
      concurrency: 50,
      totalDurationMs: totalDuration1,
      requestsPerSecond: reqPerSec10,
      p50LatencyMs: p50Pool10,
      p99LatencyMs: p99Pool10,
    },
    poolSize1: {
      concurrency: 50,
      totalDurationMs: totalDuration2,
      requestsPerSecond: reqPerSec1,
      p50LatencyMs: p50Pool1,
      p99LatencyMs: p99Pool1,
    },
  };

  console.log('Pooling Benchmark Results:', JSON.stringify(results, null, 2));
  return results;
}

if (process.argv[1].endsWith('benchmark_pooling.js')) {
  runPoolingBenchmark().catch(console.error);
}
