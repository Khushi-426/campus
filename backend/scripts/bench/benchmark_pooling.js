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
  console.log('[POOLING BENCHMARK] Measuring Pool Size = 1 vs Pool Size = 10 under 50 concurrent requests...');

  // Test 1: Constrained Connection Pool (maxPoolSize = 1)
  await connectDB({ maxPoolSize: 1, minPoolSize: 1 });
  const server1 = app.listen(0);
  const port1 = server1.address().port;
  const url1 = `http://localhost:${port1}/api/products?nocache=1`;

  const start1 = Date.now();
  const latenciesPool1 = await fireConcurrentRequests(url1, 50);
  const totalDuration1 = Date.now() - start1;

  server1.close();
  await mongoose.disconnect();

  latenciesPool1.sort((a, b) => a - b);
  const avgLatencyPool1 = Math.round(latenciesPool1.reduce((sum, v) => sum + v, 0) / latenciesPool1.length);
  const p50Pool1 = latenciesPool1[Math.floor(latenciesPool1.length * 0.5)];
  const p95Pool1 = latenciesPool1[Math.floor(latenciesPool1.length * 0.95)];
  const p99Pool1 = latenciesPool1[Math.floor(latenciesPool1.length * 0.99)];
  const reqPerSec1 = Math.round((50 / totalDuration1) * 1000);

  // Test 2: Optimized Connection Pool (maxPoolSize = 10)
  await connectDB({ maxPoolSize: 10, minPoolSize: 2 });
  const server2 = app.listen(0);
  const port2 = server2.address().port;
  const url2 = `http://localhost:${port2}/api/products?nocache=1`;

  const start2 = Date.now();
  const latenciesPool10 = await fireConcurrentRequests(url2, 50);
  const totalDuration2 = Date.now() - start2;

  server2.close();
  await mongoose.disconnect();

  latenciesPool10.sort((a, b) => a - b);
  const avgLatencyPool10 = Math.round(latenciesPool10.reduce((sum, v) => sum + v, 0) / latenciesPool10.length);
  const p50Pool10 = latenciesPool10[Math.floor(latenciesPool10.length * 0.5)];
  const p95Pool10 = latenciesPool10[Math.floor(latenciesPool10.length * 0.95)];
  const p99Pool10 = latenciesPool10[Math.floor(latenciesPool10.length * 0.99)];
  const reqPerSec10 = Math.round((50 / totalDuration2) * 1000);

  const results = {
    poolSize1: {
      maxPoolSize: 1,
      concurrency: 50,
      totalDurationMs: totalDuration1,
      requestsPerSecond: reqPerSec1,
      avgLatencyMs: avgLatencyPool1,
      p50LatencyMs: p50Pool1,
      p95LatencyMs: p95Pool1,
      p99LatencyMs: p99Pool1,
    },
    poolSize10: {
      maxPoolSize: 10,
      concurrency: 50,
      totalDurationMs: totalDuration2,
      requestsPerSecond: reqPerSec10,
      avgLatencyMs: avgLatencyPool10,
      p50LatencyMs: p50Pool10,
      p95LatencyMs: p95Pool10,
      p99LatencyMs: p99Pool10,
    },
    throughputImprovementPercent: Math.round(((reqPerSec10 - reqPerSec1) / (reqPerSec1 || 1)) * 100 * 10) / 10,
  };

  const resultsDir = path.join(process.cwd(), 'scripts', 'bench', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(resultsDir, 'pooling.json'), JSON.stringify(results, null, 2));
  console.log('[POOLING BENCHMARK] Finished. Saved to scripts/bench/results/pooling.json');
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('benchmark_pooling.js')) {
  runPoolingBenchmark().catch(console.error);
}
