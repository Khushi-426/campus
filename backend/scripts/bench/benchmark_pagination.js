import 'dotenv/config';
import dns from 'dns';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Message from '../../models/Message.js';
import Conversation from '../../models/Conversation.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

export async function runPaginationBenchmark() {
  console.log('--- 2. PAGINATION BENCHMARK ---');
  await mongoose.connect(process.env.MONGO_URI);

  const totalProducts = await Product.countDocuments();
  console.log(`Testing offset pagination across ${totalProducts} products...`);

  const skipOffsets = [0, 100, 1000, 3000, 5000, 8000];
  const offsetResults = [];

  for (const skip of skipOffsets) {
    const explain = await Product.find({ status: 'available' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(12)
      .explain('executionStats');

    const stats = explain.executionStats;
    offsetResults.push({
      page: Math.floor(skip / 12) + 1,
      skip,
      executionTimeMillis: stats.executionTimeMillis,
      totalDocsExamined: stats.totalDocsExamined,
    });
  }

  // Cursor Pagination Test on Message Thread
  const sampleConv = await Conversation.findOne();
  const cursorResults = [];

  if (sampleConv) {
    let currentCursor = null;
    for (let step = 1; step <= 5; step++) {
      const query = { conversation: sampleConv._id };
      if (currentCursor) query.createdAt = { $lt: currentCursor };

      const explain = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(10)
        .explain('executionStats');

      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(10);

      const stats = explain.executionStats;
      cursorResults.push({
        step,
        executionTimeMillis: stats.executionTimeMillis,
        totalDocsExamined: stats.totalDocsExamined,
      });

      if (messages.length > 0) {
        currentCursor = messages[messages.length - 1].createdAt;
      }
    }
  }

  const results = {
    offsetPagination: offsetResults,
    cursorPagination: cursorResults,
  };

  console.log('Pagination Benchmark Results:', JSON.stringify(results, null, 2));
  await mongoose.disconnect();
  return results;
}

if (process.argv[1].endsWith('benchmark_pagination.js')) {
  runPaginationBenchmark().catch(console.error);
}
