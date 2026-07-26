import 'dotenv/config';
import os from 'os';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

export async function getHardwareInfo() {
  let mongoVersion = 'Unknown';
  try {
    if (!mongoose.connection.readyState) {
      if (process.env.MONGO_URI) {
        await mongoose.connect(process.env.MONGO_URI);
      }
    }
    if (mongoose.connection.db) {
      const buildInfo = await mongoose.connection.db.admin().buildInfo();
      mongoVersion = buildInfo.version || '4.4+';
    }
  } catch (err) {
    mongoVersion = 'MongoDB Atlas (v4.4+)';
  }

  const cpus = os.cpus();
  const cpuModel = cpus && cpus.length > 0 ? cpus[0].model.trim() : 'Unknown CPU';
  const cpuCores = cpus.length;
  const totalRamGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  const osType = `${os.type()} ${os.release()} (${os.arch()})`;

  const info = {
    cpu: `${cpuModel} (${cpuCores} cores)`,
    ram: totalRamGB,
    os: osType,
    nodeVersion: process.version,
    mongoVersion,
    timestamp: new Date().toISOString(),
  };

  const resultsDir = path.join(process.cwd(), 'scripts', 'bench', 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(resultsDir, 'hardware.json'), JSON.stringify(info, null, 2));
  return info;
}
