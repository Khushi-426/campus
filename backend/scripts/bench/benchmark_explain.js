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

  const sampleConv = await Conversation.findOne().lean();
  const productFilter = { status: 'available', category: 'book' };

  // 1. Indexed Product Query
  const productIndexedExplain = await Product.find(productFilter)
    .sort({ createdAt: -1 })
    .limit(12)
    .explain('executionStats');

  // 2. Forced Unindexed Product Scan (COLLSCAN via hint({ $natural: 1 }))
  const productUnindexedExplain = await Product.find(productFilter)
    .sort({ createdAt: -1 })
    .limit(12)
    .hint({ $natural: 1 })
    .explain('executionStats');

  // Helper to extract detailed MongoDB explain stats
  const extractExplainDetails = (explainObj, isForcedUnindexed = false) => {
    const stats = explainObj.executionStats || {};
    const planner = explainObj.queryPlanner || {};
    const winningPlan = planner.winningPlan || {};

    const findStage = (plan) => {
      if (!plan) return 'UNKNOWN';
      if (plan.stage === 'COLLSCAN') return 'COLLSCAN';
      if (plan.stage === 'IXSCAN') return `IXSCAN (${plan.indexName || 'Index'})`;
      if (plan.inputStage) return `${plan.stage} -> ${findStage(plan.inputStage)}`;
      return plan.stage || 'UNKNOWN';
    };

    const extractIndexName = (plan) => {
      if (!plan) return 'None (Collection Scan)';
      if (plan.indexName) return plan.indexName;
      if (plan.inputStage) return extractIndexName(plan.inputStage);
      return isForcedUnindexed ? 'None (Forced $natural COLLSCAN)' : 'None (Collection Scan)';
    };

    const rawMs = stats.executionTimeMillis ?? 0;
    const formattedMs = rawMs === 0 ? '<1 ms (Rounded to 0 ms by MongoDB driver)' : `${rawMs} ms`;

    return {
      executionTimeMillis: rawMs,
      executionTimeFormatted: formattedMs,
      totalDocsExamined: stats.totalDocsExamined ?? 0,
      totalKeysExamined: stats.totalKeysExamined ?? 0,
      winningPlanStage: winningPlan.stage || 'UNKNOWN',
      winningPlanDetails: findStage(winningPlan),
      indexName: extractIndexName(winningPlan),
      nReturned: stats.nReturned ?? 0,
    };
  };

  const results = {
    productQuery: {
      description: 'Product.find({ status: "available", category: "book" }).sort({ createdAt: -1 }).limit(12)',
      indexed: extractExplainDetails(productIndexedExplain, false),
      unindexed: extractExplainDetails(productUnindexedExplain, true),
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
