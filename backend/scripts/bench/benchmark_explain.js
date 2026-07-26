import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = fs.existsSync(path.resolve('backend/.env'))
  ? path.resolve('backend/.env')
  : fs.existsSync(path.resolve('.env'))
  ? path.resolve('.env')
  : path.resolve(process.cwd(), '.env');

dotenv.config({ path: envPath });

import mongoose from 'mongoose';

import Product from '../../models/Product.js';
import Conversation from '../../models/Conversation.js';

export async function runExplainBenchmark() {
  if (!mongoose.connection.readyState) {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
    await mongoose.connect(process.env.MONGO_URI);
  }

  console.log('[EXPLAIN BENCHMARK] Running MongoDB .explain("executionStats")...');

  const sampleProduct = await Product.findOne().lean();
  const sampleConv = await Conversation.findOne().lean();

  // Query 1: Product filtering and sorting
  const productFilter = { status: 'available', category: 'book' };

  // Indexed execution
  const productIndexedExplain = await Product.find(productFilter)
    .sort({ createdAt: -1 })
    .limit(12)
    .explain('executionStats');

  // Forced Unindexed (COLLSCAN using hint({ $natural: 1 }))
  const productUnindexedExplain = await Product.find(productFilter)
    .sort({ createdAt: -1 })
    .limit(12)
    .hint({ $natural: 1 })
    .explain('executionStats');

  // Query 2: Conversation compound index lookup
  let convIndexedExplain = null;
  let convUnindexedExplain = null;

  if (sampleConv) {
    convIndexedExplain = await Conversation.findOne({
      product: sampleConv.product,
      buyer: sampleConv.buyer,
    }).explain('executionStats');

    convUnindexedExplain = await Conversation.findOne({
      product: sampleConv.product,
      buyer: sampleConv.buyer,
    }).hint({ $natural: 1 }).explain('executionStats');
  }

  const getStats = (explainObj) => {
    const stats = explainObj.executionStats || {};
    const winningStage =
      explainObj.queryPlanner?.winningPlan?.inputStage?.stage ||
      explainObj.queryPlanner?.winningPlan?.stage ||
      'UNKNOWN';

    return {
      executionTimeMillis: stats.executionTimeMillis ?? 0,
      totalDocsExamined: stats.totalDocsExamined ?? 0,
      totalKeysExamined: stats.totalKeysExamined ?? 0,
      winningPlanStage: winningStage,
      nReturned: stats.nReturned ?? 0,
    };
  };

  const results = {
    productQuery: {
      description: 'Product.find({ status: "available", category: "book" }).sort({ createdAt: -1 }).limit(12)',
      indexed: getStats(productIndexedExplain),
      unindexed: getStats(productUnindexedExplain),
    },
    conversationQuery: {
      description: 'Conversation.findOne({ product, buyer })',
      indexed: convIndexedExplain ? getStats(convIndexedExplain) : null,
      unindexed: convUnindexedExplain ? getStats(convUnindexedExplain) : null,
    },
  };

  const resultsDir = path.join(process.cwd(), 'scripts', 'bench', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(resultsDir, 'explain.json'), JSON.stringify(results, null, 2));
  console.log('[EXPLAIN BENCHMARK] Finished. Saved to scripts/bench/results/explain.json');
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('benchmark_explain.js')) {
  runExplainBenchmark()
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error(err);
      mongoose.disconnect();
      process.exit(1);
    });
}
