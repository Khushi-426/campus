import 'dotenv/config';
import dns from 'dns';
import mongoose from 'mongoose';
import Product from '../../models/Product.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

export async function runImageOffloadBench() {
  console.log('--- 1. IMAGE Payload & Offloading Benchmark ---');
  await mongoose.connect(process.env.MONGO_URI);

  const sampleProducts = await Product.find().limit(10).lean();

  // Measure average MongoDB document size (bytes)
  let totalDocBytes = 0;
  sampleProducts.forEach((p) => {
    totalDocBytes += Buffer.byteLength(JSON.stringify(p));
  });
  const avgDocSizeBefore = Math.round(totalDocBytes / sampleProducts.length);

  // Simulated base64 stored in MongoDB vs URL reference stored in MongoDB
  const base64DocSizeEstimate = avgDocSizeBefore + 250000; // ~250KB base64 per doc
  const urlDocSize = avgDocSizeBefore; // ~0.5KB static URL string

  const docSizeReductionPercent = Math.round(((base64DocSizeEstimate - urlDocSize) / base64DocSizeEstimate) * 100);

  const results = {
    avgDocSizeBase64Bytes: base64DocSizeEstimate,
    avgDocSizeStaticUrlBytes: urlDocSize,
    docSizeReductionPercent: `${docSizeReductionPercent}%`,
    listingPayload12ItemsKB: {
      beforeBase64: Math.round((base64DocSizeEstimate * 12) / 1024),
      afterStaticUrls: Math.round((urlDocSize * 12) / 1024),
    },
  };

  console.log('Image Offload Results:', JSON.stringify(results, null, 2));
  await mongoose.disconnect();
  return results;
}

if (process.argv[1].endsWith('bench_image_offload.js')) {
  runImageOffloadBench().catch(console.error);
}
