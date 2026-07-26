import 'dotenv/config';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { protect, adminOnly } from '../middleware/auth.js';

const app = express();
app.use(express.json());

// Mock request handler for testing
app.get('/api/admin/test', protect, adminOnly, (req, res) => {
  res.json({ success: true, message: 'Welcome to Admin Panel', user: req.user });
});

function makeRequest(port, token) {
  return new Promise((resolve) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.get({ hostname: 'localhost', port, path: '/api/admin/test', headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: JSON.parse(data || '{}') });
      });
    });
    req.on('error', (err) => resolve({ statusCode: 500, error: err.message }));
  });
}

export async function runAdminAuthTest() {
  console.log('--- TESTING ADMIN AUTHORIZATION MIDDLEWARE ---');

  const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_benchmarks';

  // Create mock tokens
  const standardUserToken = jwt.sign(
    { id: '60d5ecb8b5c9c22b1c8e1111', role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const adminUserToken = jwt.sign(
    { id: '60d5ecb8b5c9c22b1c8e2222', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // We temporarily mock User.findById inside auth middleware test scope
  const server = app.listen(0);
  const port = server.address().port;

  // Case 1: Unauthenticated request (no token) -> Expect 401
  const res1 = await makeRequest(port, null);
  console.log(`[Test 1] Unauthenticated Request: Status = ${res1.statusCode} (Expected 401)`);
  const pass1 = res1.statusCode === 401;

  server.close();
  return { pass1 };
}

if (process.argv[1].endsWith('testAdminAuth.js')) {
  runAdminAuthTest().catch(console.error);
}
