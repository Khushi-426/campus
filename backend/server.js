import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import compression from 'compression';
import helmet from 'helmet';
import { Server } from 'socket.io';

import connectDB from './config/db.js';
import initSocket from './socket/index.js';
import { apiLimiter } from './middleware/rateLimit.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

connectDB({ maxPoolSize: 10, minPoolSize: 2 });

const app = express();
const server = http.createServer(app);

// Enable HTTP Security Headers & Gzip Compression
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());

// Enable ETag headers for HTTP 304 conditional request caching
app.set('etag', 'strong');

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000' },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '5mb' }));

// Serve static uploaded product images from disk
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '7d',
  etag: true,
}));

app.use(apiLimiter);

// Custom Cache-Control Headers Middleware for GET APIs
app.use('/api/products', (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=10, must-revalidate');
  }
  next();
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Central error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: 'Server error' });
});

initSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
