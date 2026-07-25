const mongoose = require('mongoose');

// System design note: maxPoolSize controls how many concurrent DB connections
// a single server instance keeps open. Tuning this (instead of opening a new
// connection per-request) is what keeps p99 latency low under load.
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);

    // The URI is the only local-vs-managed-Mongo configuration difference.
    // Retune pool sizes for an Atlas/managed tier's connection limits and
    // expected workload; these values are intentionally suitable for local dev.
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB connected: ${mongoose.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
