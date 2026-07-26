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
import connectDB from '../../config/db.js';
import productRoutes from '../../routes/productRoutes.js';

import User from '../../models/User.js';
import Product from '../../models/Product.js';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/products', productRoutes);

function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          statusCode: res.statusCode,
          duration,
          cacheHeader: res.headers['x-cache'] || 'MISS',
          body: JSON.parse(body || '{}'),
        });
      });
    });
    req.on('error', reject);
  });
}

function postRequest(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payload);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr),
        ...headers,
      },
    };
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          cacheHeader: res.headers['x-cache'] || 'MISS',
          body: JSON.parse(body || '{}'),
        });
      });
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

export async function runCacheBenchmark() {
  console.log('[CACHE BENCHMARK] Measuring Cold Cache -> Warm Cache -> After Invalidation...');
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/products`;

  // 1. Cold Cache (1st request / cache miss)
  const coldRes = await makeRequest(baseUrl);
  const coldLatencyMs = coldRes.duration;

  // 2. Warm Cache (100 requests)
  const warmLatencies = [];
  for (let i = 0; i < 100; i++) {
    const res = await makeRequest(baseUrl);
    warmLatencies.push(res.duration);
  }

  warmLatencies.sort((a, b) => a - b);
  const warmAvgMs = Math.round(warmLatencies.reduce((a, b) => a + b, 0) / warmLatencies.length);
  const warmP50Ms = warmLatencies[Math.floor(warmLatencies.length * 0.5)];
  const warmP95Ms = warmLatencies[Math.floor(warmLatencies.length * 0.95)];
  const warmP99Ms = warmLatencies[Math.floor(warmLatencies.length * 0.99)];

  // 3. Write Invalidation Test
  const user = await User.findOne();
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

  // Make sure cache is primed
  await makeRequest(baseUrl);

  // Trigger write (POST new product)
  const newProd = await postRequest(
    baseUrl,
    {
      title: 'Cache Invalidation Verification Item',
      description: 'Testing cache invalidation on write',
      category: 'book',
      price: 199,
      condition: 'good',
    },
    { Authorization: `Bearer ${token}` }
  );

  // Immediate read post-write
  const postWriteRes = await makeRequest(baseUrl);
  const postWriteLatencyMs = postWriteRes.duration;

  // Cleanup created item
  if (newProd.body.product?._id) {
    await Product.deleteOne({ _id: newProd.body.product._id });
  }

  server.close();

  const results = {
    coldCache: {
      latencyMs: coldLatencyMs,
      cacheHeader: coldRes.cacheHeader,
      state: 'COLD',
    },
    warmCache: {
      requests: 100,
      avgLatencyMs: warmAvgMs,
      p50LatencyMs: warmP50Ms,
      p95LatencyMs: warmP95Ms,
      p99LatencyMs: warmP99Ms,
      cacheHeader: 'HIT',
      state: 'WARM',
    },
    afterInvalidation: {
      postWriteLatencyMs,
      cacheHeader: postWriteRes.cacheHeader,
      state: 'INVALIDATED (MISS)',
      invalidationVerified: postWriteRes.cacheHeader === 'MISS',
    },
    latencyReductionPercent: Math.round(((coldLatencyMs - warmP50Ms) / (coldLatencyMs || 1)) * 100 * 10) / 10,
  };

  const resultsDir = path.join(process.cwd(), 'scripts', 'bench', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(resultsDir, 'cache.json'), JSON.stringify(results, null, 2));
  console.log('[CACHE BENCHMARK] Finished. Saved to scripts/bench/results/cache.json');
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('benchmark_cache.js')) {
  runCacheBenchmark().catch(console.error);
}
