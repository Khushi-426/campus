import 'dotenv/config';
import { runIndexingBenchmark } from './benchmark_indexing.js';
import { runPaginationBenchmark } from './benchmark_pagination.js';
import { runCacheBenchmark } from './benchmark_cache.js';
import { runChatBenchmark } from './benchmark_chat.js';
import { runPoolingBenchmark } from './benchmark_pooling.js';
import { runRateLimitBenchmark } from './benchmark_rate_limit.js';
import { runAuthBenchmark } from './benchmark_auth.js';

async function runAll() {
  console.log('====================================================');
  console.log('RUNNING FULL SYSTEM DESIGN BENCHMARK SUITE');
  console.log('====================================================\n');

  const suiteResults = {};

  try {
    suiteResults.indexing = await runIndexingBenchmark();
    console.log('\n');

    suiteResults.pagination = await runPaginationBenchmark();
    console.log('\n');

    suiteResults.cache = await runCacheBenchmark();
    console.log('\n');

    suiteResults.chat = await runChatBenchmark();
    console.log('\n');

    suiteResults.pooling = await runPoolingBenchmark();
    console.log('\n');

    suiteResults.rateLimit = await runRateLimitBenchmark();
    console.log('\n');

    suiteResults.auth = await runAuthBenchmark();
    console.log('\n');

    console.log('====================================================');
    console.log('ALL BENCHMARKS COMPLETED SUCCESSFULLY');
    console.log('====================================================');
  } catch (err) {
    console.error('Benchmark suite error:', err);
    process.exit(1);
  }
}

runAll();
