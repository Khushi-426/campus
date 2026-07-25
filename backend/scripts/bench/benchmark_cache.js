import 'dotenv/config';
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
          cacheHeader: res.headers['x-cache'],
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
          cacheHeader: res.headers['x-cache'],
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
  console.log('--- 3. CACHING BENCHMARK ---');
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/products`;

  // Measure Cold vs Warm Cache Latency over 100 requests
  const coldRes = await makeRequest(baseUrl);
  const coldLatency = coldRes.duration;

  const latencies = [];
  for (let i = 0; i < 100; i++) {
    const res = await makeRequest(baseUrl);
    latencies.push(res.duration);
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];

  // Test Write Invalidation
  const user = await User.findOne();
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Prime cache
  const primedRes = await makeRequest(baseUrl);
  const wasWarm = primedRes.cacheHeader === 'HIT';

  // Trigger Write (Create Product)
  const newProductRes = await postRequest(
    baseUrl,
    {
      title: 'Benchmark Cache Test Item',
      description: 'Testing cache invalidation',
      category: 'book',
      price: 250,
      condition: 'good',
    },
    { Authorization: `Bearer ${token}` }
  );

  // Next read after write
  const postWriteRes = await makeRequest(baseUrl);
  const postWriteCacheHeader = postWriteRes.cacheHeader;

  // Cleanup created test product
  if (newProductRes.body.product?._id) {
    await Product.deleteOne({ _id: newProductRes.body.product._id });
  }

  server.close();

  const results = {
    coldLatencyMs: coldLatency,
    warmLatencyMs: {
      p50,
      p99,
      average: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    },
    invalidationTest: {
      wasWarm,
      postWriteCacheHeader,
      invalidationSuccess: postWriteCacheHeader === 'MISS',
    },
  };

  console.log('Cache Benchmark Results:', JSON.stringify(results, null, 2));
  return results;
}

if (process.argv[1].endsWith('benchmark_cache.js')) {
  runCacheBenchmark().catch(console.error);
}
