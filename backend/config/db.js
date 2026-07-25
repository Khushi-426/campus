import mongoose from "mongoose";
import dns from "dns";

// Fix Node.js SRV DNS lookup issues on Windows / local network for mongodb+srv://
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const connectDB = async (options = {}) => {
  try {
    const connOptions = {
      maxPoolSize: process.env.MONGO_MAX_POOL_SIZE ? parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) : 10,
      minPoolSize: process.env.MONGO_MIN_POOL_SIZE ? parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) : 2,
      ...options,
    };
    await mongoose.connect(process.env.MONGO_URI, connOptions);
    console.log("MongoDB Connected (Connection Pool initialized)");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

export default connectDB;
