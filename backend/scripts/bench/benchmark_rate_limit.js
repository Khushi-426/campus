import 'dotenv/config';
import http from 'http';
import express from 'express';
import connectDB from '../../config/db.js';
import authRoutes from '../../routes/authRoutes.js';
import productRoutes from '../../routes/productRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

function postRequest(url, payload) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payload);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr),
      },
    };
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

export async function runRateLimitBenchmark() {
  console.log('--- 6. RATE LIMITING BENCHMARK ---');
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const authUrl = `http://localhost:${port}/api/auth/login`;

  const responses = [];
  // Send 25 consecutive requests past the 20-request threshold
  for (let i = 1; i <= 25; i++) {
    const res = await postRequest(authUrl, { email: 'test@campustrade.test', password: 'wrongpassword' });
    responses.push({ attempt: i, statusCode: res.statusCode });
  }

  server.close();

  const rateLimitedCount = responses.filter((r) => r.statusCode === 429).length;
  const first429Attempt = responses.find((r) => r.statusCode === 429)?.attempt;

  const results = {
    configuredLimits: {
      authLimiter: { windowMs: '15 minutes', maxRequests: 20 },
      apiLimiter: { windowMs: '1 minute', maxRequests: 120 },
    },
    authTest: {
      totalAttempts: 25,
      rateLimited429Count: rateLimitedCount,
      thresholdEnforcedAtAttempt: first429Attempt,
      rateLimitSuccess: first429Attempt === 21,
    },
  };

  console.log('Rate Limit Benchmark Results:', JSON.stringify(results, null, 2));
  return results;
}

if (process.argv[1].endsWith('benchmark_rate_limit.js')) {
  runRateLimitBenchmark().catch(console.error);
}
