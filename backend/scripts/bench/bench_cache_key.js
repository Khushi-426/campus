import 'dotenv/config';
import http from 'http';
import express from 'express';
import connectDB from '../../config/db.js';
import productRoutes from '../../routes/productRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/products', productRoutes);

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ statusCode: res.statusCode, cacheHeader: res.headers['x-cache'] }));
    });
    req.on('error', reject);
  });
}

export async function runCacheKeyBench() {
  console.log('--- 5. CACHE KEY Correctness & Hit-Rate Benchmark ---');
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/products`;

  // Simulated User Session changing filters page-by-page
  const simulatedRequests = [
    `${baseUrl}?category=book&minPrice=100`, // Request 1: Cold (MISS)
    `${baseUrl}?minPrice=100&category=book`, // Request 2: Order variation (Should HIT due to key normalization!)
    `${baseUrl}?category=book&minPrice=100`, // Request 3: Repeat (HIT)
    `${baseUrl}?category=calculator`,        // Request 4: New category filter (MISS)
    `${baseUrl}?category=calculator`,        // Request 5: Repeat (HIT)
    `${baseUrl}?category=calculator&page=2`,  // Request 6: Page 2 (MISS)
    `${baseUrl}?category=calculator&page=2`,  // Request 7: Repeat (HIT)
  ];

  const resultsList = [];
  for (const url of simulatedRequests) {
    const res = await makeRequest(url);
    resultsList.push({ url, cacheHeader: res.cacheHeader });
  }

  server.close();

  const hits = resultsList.filter((r) => r.cacheHeader === 'HIT').length;
  const total = resultsList.length;
  const hitRatePercent = Math.round((hits / total) * 100);

  const results = {
    totalSessionRequests: total,
    cacheHits: hits,
    cacheMisses: total - hits,
    hitRatePercent: `${hitRatePercent}%`,
    normalizedKeySuccess: resultsList[1].cacheHeader === 'HIT',
  };

  console.log('Cache Key Results:', JSON.stringify(results, null, 2));
  return results;
}

if (process.argv[1].endsWith('bench_cache_key.js')) {
  runCacheKeyBench().catch(console.error);
}
