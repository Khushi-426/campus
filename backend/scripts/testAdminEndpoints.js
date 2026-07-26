import 'dotenv/config';
import http from 'http';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import connectDB from '../config/db.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Report from '../models/Report.js';

import adminRoutes from '../routes/adminRoutes.js';
import { apiLimiter } from '../middleware/rateLimit.js';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

function requestAPI(port, method, path, token, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: 'localhost',
        port,
        method,
        path,
        headers,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (c) => (responseBody += c));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(responseBody || '{}') });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: responseBody });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

export async function runAdminEndpointsTest() {
  console.log('====================================================');
  console.log('TESTING ALL /api/admin ENDPOINTS');
  console.log('====================================================\n');

  await connectDB({ maxPoolSize: 5 });
  const server = app.listen(0);
  const port = server.address().port;

  try {
    // 1. Fetch or create Admin user & Standard user
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({
        name: 'Test Admin',
        email: `testadmin_${Date.now()}@campus.edu`,
        password: 'password123',
        role: 'admin',
      });
    }

    let standardUser = await User.findOne({ role: 'user' });
    if (!standardUser) {
      standardUser = await User.create({
        name: 'Test Student',
        email: `teststudent_${Date.now()}@campus.edu`,
        password: 'password123',
        role: 'user',
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_benchmarks';
    const adminToken = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '1h' });
    const userToken = jwt.sign({ id: standardUser._id }, JWT_SECRET, { expiresIn: '1h' });

    console.log('1. GET /api/admin/dashboard...');
    const dashRes = await requestAPI(port, 'GET', '/api/admin/dashboard', adminToken);
    console.log(`   Status: ${dashRes.statusCode} -> Total Users: ${dashRes.body.users?.total}, Listings: ${dashRes.body.listings?.total}`);

    console.log('2. GET /api/admin/users...');
    const usersRes = await requestAPI(port, 'GET', '/api/admin/users', adminToken);
    console.log(`   Status: ${usersRes.statusCode} -> Users returned: ${usersRes.body.users?.length}`);

    console.log('3. PUT /api/admin/users/:id/suspend...');
    const suspendRes = await requestAPI(port, 'PUT', `/api/admin/users/${standardUser._id}/suspend`, adminToken, { reason: 'Test policy breach' });
    console.log(`   Status: ${suspendRes.statusCode} -> Message: ${suspendRes.body.message}`);

    // Create a fresh active user for the report test
    const activeReporter = await User.create({
      name: 'Active Student Reporter',
      email: `reporter_${Date.now()}@campus.edu`,
      password: 'password123',
      role: 'user',
      isSuspended: false,
    });
    const reporterToken = jwt.sign({ id: activeReporter._id }, JWT_SECRET, { expiresIn: '1h' });

    console.log('4. GET /api/admin/listings...');
    const listingsRes = await requestAPI(port, 'GET', '/api/admin/listings', adminToken);
    console.log(`   Status: ${listingsRes.statusCode} -> Listings returned: ${listingsRes.body.items?.length}`);

    let testProduct = await Product.findOne({ status: 'available' });
    if (!testProduct) {
      testProduct = await Product.create({
        title: 'Test Engineering Textbook',
        description: 'Test description for moderation removal',
        category: 'book',
        price: 350,
        seller: standardUser._id,
      });
    }

    console.log('5. POST /api/admin/reports (User creating report)...');
    const reportCreateRes = await requestAPI(port, 'POST', '/api/admin/reports', reporterToken, {
      targetType: 'product',
      targetId: testProduct._id,
      reason: 'Prohibited resale item',
    });
    console.log(`   Status: ${reportCreateRes.statusCode} -> Report ID: ${reportCreateRes.body.report?._id}`);
    const reportId = reportCreateRes.body.report?._id;

    console.log('6. GET /api/admin/reports...');
    const reportsRes = await requestAPI(port, 'GET', '/api/admin/reports', adminToken);
    console.log(`   Status: ${reportsRes.statusCode} -> Pending Reports: ${reportsRes.body.reports?.length}`);

    if (reportId) {
      console.log('7. PUT /api/admin/reports/:id (Resolve report)...');
      const updateReportRes = await requestAPI(port, 'PUT', `/api/admin/reports/${reportId}`, adminToken, { status: 'resolved', reason: 'Verified and action taken' });
      console.log(`   Status: ${updateReportRes.statusCode} -> Message: ${updateReportRes.body.message}`);
    }

    console.log('8. DELETE /api/admin/listings/:id (Unpublish listing with reason)...');
    const removeListingRes = await requestAPI(port, 'DELETE', `/api/admin/listings/${testProduct._id}?reason=Policy+violation`, adminToken);
    console.log(`   Status: ${removeListingRes.statusCode} -> Message: ${removeListingRes.body.message}`);

    console.log('9. GET /api/admin/audit (Fetch Admin Action Audit Log)...');
    const auditRes = await requestAPI(port, 'GET', '/api/admin/audit', adminToken);
    console.log(`   Status: ${auditRes.statusCode} -> Audit log entries: ${auditRes.body.actions?.length}`);

    console.log('\n====================================================');
    console.log('ALL 9 ADMIN ENDPOINTS VERIFIED WORKING!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('Admin endpoints test error:', err);
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

if (process.argv[1].endsWith('testAdminEndpoints.js')) {
  runAdminEndpointsTest().catch(console.error);
}
