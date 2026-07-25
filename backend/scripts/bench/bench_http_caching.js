import 'dotenv/config';
import http from 'http';
import express from 'express';
import connectDB from '../../config/db.js';
import productRoutes from '../../routes/productRoutes.js';

const app = express();
app.set('etag', 'strong');
app.use(express.json());
app.use('/api/products', (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=10, must-revalidate');
  }
  next();
});
app.use('/api/products', productRoutes);

function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          statusCode: res.statusCode,
          etag: res.headers.etag,
          cacheControl: res.headers['cache-control'],
          bytes: body.length,
          durationMs: duration,
        });
      });
    });
    req.on('error', reject);
  });
}

export async function runHttpCachingBench() {
  console.log('--- 4. HTTP ETag & 304 Caching Benchmark ---');
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const url = `http://localhost:${port}/api/products`;

  // 1st Request: Fresh request (200 OK + returns ETag)
  const req1 = await makeRequest(url);

  // 2nd Request: Repeat request with If-None-Match header matching ETag (304 Not Modified)
  const req2 = await makeRequest(url, { 'If-None-Match': req1.etag });

  server.close();

  const results = {
    initialRequest: {
      statusCode: req1.statusCode,
      etagHeader: req1.etag,
      transferBytes: req1.bytes,
      latencyMs: req1.durationMs,
    },
    repeatConditionalRequest: {
      statusCode: req2.statusCode,
      expectedStatusCode: 304,
      transferBytes: req2.bytes,
      latencyMs: req2.durationMs,
      passed: req2.statusCode === 304,
    },
    bandwidthSavingsBytes: req1.bytes - req2.bytes,
  };

  console.log('HTTP Caching Results:', JSON.stringify(results, null, 2));
  return results;
}

if (process.argv[1].endsWith('bench_http_caching.js')) {
  runHttpCachingBench().catch(console.error);
}
