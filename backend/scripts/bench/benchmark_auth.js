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

function request(url, method, payload = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataStr = payload ? JSON.stringify(payload) : '';
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr),
        ...headers,
      },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

export async function runAuthBenchmark() {
  console.log('--- 7. AUTHENTICATION VS AUTHORIZATION BENCHMARK ---');
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/products`;

  // Fetch two distinct users and a product owned by User B
  const users = await User.find().limit(2);
  const userA = users[0];
  const userB = users[1];

  const productB = await Product.findOne({ seller: userB._id });
  if (!productB) throw new Error('Product owned by User B not found');

  const tokenA = jwt.sign({ id: userA._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const tokenB = jwt.sign({ id: userB._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Test 1: Unauthenticated request (No JWT Token) -> Expect 401 Unauthorized
  const test1 = await request(`${baseUrl}/${productB._id}`, 'DELETE');

  // Test 2: Authenticated but Unauthorized request (User A trying to delete User B's product) -> Expect 403 Forbidden
  const test2 = await request(`${baseUrl}/${productB._id}`, 'DELETE', null, {
    Authorization: `Bearer ${tokenA}`,
  });

  // Test 3: Authenticated and Authorized request (User B updating User B's product) -> Expect 200 OK
  const test3 = await request(
    `${baseUrl}/${productB._id}`,
    'PUT',
    { title: `${productB.title} (Updated by Owner)` },
    { Authorization: `Bearer ${tokenB}` }
  );

  server.close();

  const results = {
    test1_Unauthenticated: {
      action: 'DELETE product without Bearer token',
      expectedStatusCode: 401,
      actualStatusCode: test1.statusCode,
      message: test1.body.message,
      passed: test1.statusCode === 401,
    },
    test2_UnauthorizedNonOwner: {
      action: 'DELETE product owned by User B using User A JWT',
      expectedStatusCode: 403,
      actualStatusCode: test2.statusCode,
      message: test2.body.message,
      passed: test2.statusCode === 403,
    },
    test3_AuthorizedOwner: {
      action: 'PUT update product owned by User B using User B JWT',
      expectedStatusCode: 200,
      actualStatusCode: test3.statusCode,
      passed: test3.statusCode === 200,
    },
  };

  console.log('Auth Benchmark Results:', JSON.stringify(results, null, 2));
  return results;
}

if (process.argv[1].endsWith('benchmark_auth.js')) {
  runAuthBenchmark().catch(console.error);
}
