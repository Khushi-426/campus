import 'dotenv/config';
import dns from 'dns';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import Conversation from '../../models/Conversation.js';
import User from '../../models/User.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

export async function runIndexingBenchmark() {
  console.log('--- 1. INDEXING BENCHMARK ---');
  await mongoose.connect(process.env.MONGO_URI);

  const totalProducts = await Product.countDocuments();
  console.log(`Dataset size: ${totalProducts} products in collection.`);

  const queryFilter = { status: 'available', category: 'book' };
  const sortOption = { createdAt: -1 };

  // Query WITH Compound Index
  const indexedExplain = await Product.find(queryFilter)
    .sort(sortOption)
    .limit(12)
    .explain('executionStats');

  const indexedStats = indexedExplain.executionStats;

  // Query WITHOUT Compound Index (Hinting $natural scan to simulate unindexed collection)
  const unindexedExplain = await Product.find(queryFilter)
    .sort(sortOption)
    .limit(12)
    .hint({ $natural: 1 })
    .explain('executionStats');

  const unindexedStats = unindexedExplain.executionStats;

  // Unique Compound Index Test on Conversation
  const users = await User.find().limit(2);
  const sampleProduct = await Product.findOne();

  let duplicatePrevented = false;
  try {
    // Attempt duplicate insert
    await Conversation.create({
      product: sampleProduct._id,
      buyer: users[0]._id,
      seller: sampleProduct.seller,
    });
    await Conversation.create({
      product: sampleProduct._id,
      buyer: users[0]._id,
      seller: sampleProduct.seller,
    });
  } catch (err) {
    if (err.code === 11000) {
      duplicatePrevented = true;
    }
  }

  const convExplain = await Conversation.find({ product: sampleProduct._id, buyer: users[0]._id })
    .explain('executionStats');

  const results = {
    datasetSize: totalProducts,
    withIndex: {
      executionTimeMillis: indexedStats.executionTimeMillis,
      totalDocsExamined: indexedStats.totalDocsExamined,
      nReturned: indexedStats.nReturned,
      stage: indexedExplain.queryPlanner.winningPlan.stage || 'IXSCAN',
    },
    withoutIndex: {
      executionTimeMillis: unindexedStats.executionTimeMillis,
      totalDocsExamined: unindexedStats.totalDocsExamined,
      nReturned: unindexedStats.nReturned,
      stage: 'COLLSCAN ($natural hint)',
    },
    uniqueIndex: {
      duplicatePrevented,
      lookupTimeMillis: convExplain.executionStats.executionTimeMillis,
      totalDocsExamined: convExplain.executionStats.totalDocsExamined,
    },
  };

  console.log('Indexing Benchmark Results:', JSON.stringify(results, null, 2));
  await mongoose.disconnect();
  return results;
}

if (process.argv[1].endsWith('benchmark_indexing.js')) {
  runIndexingBenchmark().catch(console.error);
}
