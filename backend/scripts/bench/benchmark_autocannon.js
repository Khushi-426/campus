import autocannon from 'autocannon';
import path from 'path';
import fs from 'fs';

export async function runAutocannonBenchmark(baseUrl = 'http://localhost:5000') {
  console.log(`[AUTOCANNON BENCHMARK] Running REST API load tests on ${baseUrl}...`);

  const concurrencyLevels = [10, 25, 50, 100];
  const endpoint = `${baseUrl}/api/products`;
  const duration = 5; // seconds per test run

  const concurrencyResults = [];

  for (const connections of concurrencyLevels) {
    console.log(`  -> Testing concurrency = ${connections} connections...`);
    const instance = await autocannon({
      url: endpoint,
      connections,
      duration,
      pipelining: 1,
    });

    const p95Val = instance.latency.p95 || instance.latency.p97_5 || instance.latency.p90 || instance.latency.p50;

    concurrencyResults.push({
      concurrency: connections,
      requestsPerSec: Math.round(instance.requests.average * 100) / 100,
      totalRequests: instance.requests.total,
      totalDurationSeconds: instance.duration,
      latencyAvgMs: Math.round(instance.latency.average * 100) / 100,
      latencyP50Ms: instance.latency.p50,
      latencyP95Ms: p95Val,
      latencyP99Ms: instance.latency.p99,
      latencyMaxMs: instance.latency.max,
      latencyStddevMs: Math.round((instance.latency.stddev || 0) * 100) / 100,
      throughputBytesPerSec: Math.round(instance.throughput.average),
      throughputMBPerSec: Math.round((instance.throughput.average / (1024 * 1024)) * 100) / 100,
      errors: instance.errors,
      timeouts: instance.timeouts,
    });
  }

  const results = {
    endpoint: '/api/products',
    durationSeconds: duration,
    levels: concurrencyResults,
  };

  const resultsDir = path.join(process.cwd(), 'scripts', 'bench', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(resultsDir, 'autocannon.json'), JSON.stringify(results, null, 2));
  console.log('[AUTOCANNON BENCHMARK] Finished. Saved to scripts/bench/results/autocannon.json');
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('benchmark_autocannon.js')) {
  runAutocannonBenchmark().catch(console.error);
}
