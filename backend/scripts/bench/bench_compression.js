import 'dotenv/config';
import http from 'http';
import express from 'express';
import compression from 'compression';
import connectDB from '../../config/db.js';
import productRoutes from '../../routes/productRoutes.js';

const appUncompressed = express();
appUncompressed.use(express.json());
appUncompressed.use('/api/products', productRoutes);

const appCompressed = express();
appCompressed.use(compression());
appCompressed.use(express.json());
appCompressed.use('/api/products', productRoutes);

function fetchResponseStats(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get(url, { headers }, (res) => {
      let size = 0;
      res.on('data', (chunk) => (size += chunk.length));
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          statusCode: res.statusCode,
          contentEncoding: res.headers['content-encoding'] || 'none',
          bytesReceived: size,
          durationMs: duration,
        });
      });
    });
    req.on('error', reject);
  });
}

export async function runCompressionBench() {
  console.log('--- 3. COMPRESSION Middleware Benchmark ---');
  await connectDB();

  const serverUncomp = appUncompressed.listen(0);
  const portUncomp = serverUncomp.address().port;

  const serverComp = appCompressed.listen(0);
  const portComp = serverComp.address().port;

  const urlUncomp = `http://localhost:${portUncomp}/api/products?nocache=1`;
  const urlComp = `http://localhost:${portComp}/api/products?nocache=1`;

  // Measure Uncompressed
  const uncompStats = await fetchResponseStats(urlUncomp);

  // Measure Compressed with Accept-Encoding: gzip
  const compStats = await fetchResponseStats(urlComp, { 'Accept-Encoding': 'gzip, deflate' });

  serverUncomp.close();
  serverComp.close();

  const sizeReductionPercent = Math.round(
    ((uncompStats.bytesReceived - compStats.bytesReceived) / (uncompStats.bytesReceived || 1)) * 100
  );

  const results = {
    uncompressed: {
      bytesReceived: uncompStats.bytesReceived,
      sizeKB: (uncompStats.bytesReceived / 1024).toFixed(2),
      transferTimeMs: uncompStats.durationMs,
    },
    gzipCompressed: {
      bytesReceived: compStats.bytesReceived,
      sizeKB: (compStats.bytesReceived / 1024).toFixed(2),
      transferTimeMs: compStats.durationMs,
    },
    savingsPercent: `${sizeReductionPercent}%`,
  };

  console.log('Compression Results:', JSON.stringify(results, null, 2));
  return results;
}

if (process.argv[1].endsWith('bench_compression.js')) {
  runCompressionBench().catch(console.error);
}
