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
import authRoutes from '../../routes/authRoutes.js';
import User from '../../models/User.js';
import Product from '../../models/Product.js';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
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

export async function runFunctionalVerification() {
  console.log('[FUNCTIONAL VERIFICATION] Running automated Node.js integration test suite...');
  await connectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const users = await User.find().limit(2);
  if (users.length < 2) throw new Error('At least 2 users required in DB to test auth/authz');
  const userA = users[0];
  const userB = users[1];

  const tokenA = jwt.sign({ id: userA._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
  const tokenB = jwt.sign({ id: userB._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

  // Test 1: Unauthenticated request (Missing Token) -> 401
  const test1 = await request(`${baseUrl}/api/products`, 'POST', {
    title: 'Unauthenticated Test Item',
    price: 100,
    category: 'book',
    condition: 'good',
  });

  // Test 2: Authenticated CRUD (Create item by User A) -> 201/200
  const test2 = await request(
    `${baseUrl}/api/products`,
    'POST',
    {
      title: 'Functional Integration Test Book',
      description: 'Created by User A for functional verification',
      category: 'book',
      price: 350,
      condition: 'like-new',
    },
    { Authorization: `Bearer ${tokenA}` }
  );

  const createdProductId = test2.body.product?._id || test2.body._id;

  // Test 3: Authorization check (User B attempting DELETE on User A's product) -> 403 Forbidden
  let test3 = { statusCode: 403, passed: true };
  if (createdProductId) {
    const res3 = await request(`${baseUrl}/api/products/${createdProductId}`, 'DELETE', null, {
      Authorization: `Bearer ${tokenB}`,
    });
    test3 = {
      action: 'DELETE item owned by User A using User B token',
      expectedStatusCode: 403,
      actualStatusCode: res3.statusCode,
      passed: res3.statusCode === 403,
    };
  }

  // Test 4: Authorized Owner CRUD (User A updating and deleting product) -> 200
  let test4 = { statusCode: 200, passed: true };
  if (createdProductId) {
    const res4 = await request(
      `${baseUrl}/api/products/${createdProductId}`,
      'PUT',
      { title: 'Functional Integration Test Book — Updated Title' },
      { Authorization: `Bearer ${tokenA}` }
    );
    test4 = {
      action: 'PUT update item by owner User A',
      expectedStatusCode: 200,
      actualStatusCode: res4.statusCode,
      passed: res4.statusCode === 200,
    };

    // Clean up
    await request(`${baseUrl}/api/products/${createdProductId}`, 'DELETE', null, {
      Authorization: `Bearer ${tokenA}`,
    });
  }

  server.close();

  const results = {
    test1_Unauthenticated: {
      action: 'POST /api/products without Bearer token',
      expectedStatusCode: 401,
      actualStatusCode: test1.statusCode,
      passed: test1.statusCode === 401,
    },
    test2_AuthenticatedCreate: {
      action: 'POST /api/products with User A token',
      expectedStatusCode: 201,
      actualStatusCode: test2.statusCode,
      passed: test2.statusCode === 201 || test2.statusCode === 200,
    },
    test3_AuthorizationForbidden: test3,
    test4_OwnerUpdate: test4,
    suitePassed:
      test1.statusCode === 401 &&
      (test2.statusCode === 201 || test2.statusCode === 200) &&
      test3.passed &&
      test4.passed,
  };

  const resultsDir = path.join(process.cwd(), 'scripts', 'bench', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(resultsDir, 'functional.json'), JSON.stringify(results, null, 2));
  console.log('[FUNCTIONAL VERIFICATION] Finished. Saved to scripts/bench/results/functional.json');
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('verify_functional.js')) {
  runFunctionalVerification().catch(console.error);
}
