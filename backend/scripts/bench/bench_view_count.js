import 'dotenv/config';
import http from 'http';
import express from 'express';
import connectDB from '../../config/db.js';
import Product from '../../models/Product.js';

const app = express();
app.use(express.json());

// Simulated Endpoint A (Before): Synchronous DB write on every read
app.get('/api/products/before/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simulated Endpoint B (After): Deduplicated + Fire-and-forget DB update
const viewDedupe = new Map();
app.get('/api/products/after/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    const key = `${req.ip}:${req.params.id}`;
    if (!viewDedupe.has(key)) {
      viewDedupe.set(key, Date.now());
      Product.updateOne({ _id: req.params.id }, { $inc: { viewCount: 1 } }).exec();
    }
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function fireRequests(url, count) {
  const promises = Array.from({ length: count }, () => {
    return new Promise((resolve) => {
      const start = Date.now();
      http.get(url, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve(Date.now() - start));
      }).on('error', () => resolve(Date.now() - start));
    });
  });
  return Promise.all(promises);
}

export async function runViewCountBench() {
  console.log('--- 2. VIEWCOUNT Write Optimization Benchmark ---');
  await connectDB();

  const sampleProduct = await Product.findOne();
  if (!sampleProduct) throw new Error('No product found for viewCount bench');

  const server = app.listen(0);
  const port = server.address().port;

  const urlBefore = `http://localhost:${port}/api/products/before/${sampleProduct._id}`;
  const urlAfter = `http://localhost:${port}/api/products/after/${sampleProduct._id}`;

  // Measure Before (Sync write on read under 50 concurrent requests)
  const latenciesBefore = await fireRequests(urlBefore, 50);
  latenciesBefore.sort((a, b) => a - b);
  const p50Before = latenciesBefore[Math.floor(latenciesBefore.length * 0.5)];
  const p99Before = latenciesBefore[Math.floor(latenciesBefore.length * 0.99)];

  // Measure After (Fire-and-forget read under 50 concurrent requests)
  const latenciesAfter = await fireRequests(urlAfter, 50);
  latenciesAfter.sort((a, b) => a - b);
  const p50After = latenciesAfter[Math.floor(latenciesAfter.length * 0.5)];
  const p99After = latenciesAfter[Math.floor(latenciesAfter.length * 0.99)];

  server.close();

  const results = {
    syncWriteOnRead: { p50LatencyMs: p50Before, p99LatencyMs: p99Before },
    fireAndForgetRead: { p50LatencyMs: p50After, p99LatencyMs: p99After },
    improvement: {
      p50ReductionPercent: `${Math.round(((p50Before - p50After) / (p50Before || 1)) * 100)}%`,
      p99ReductionPercent: `${Math.round(((p99Before - p99After) / (p99Before || 1)) * 100)}%`,
    },
  };

  console.log('ViewCount Results:', JSON.stringify(results, null, 2));
  return results;
}

if (process.argv[1].endsWith('bench_view_count.js')) {
  runViewCountBench().catch(console.error);
}
