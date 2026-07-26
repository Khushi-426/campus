import 'dotenv/config';
import crypto from 'crypto';
import dns from 'dns';
import mongoose from 'mongoose';
import User from '../models/User.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

async function createAdmin() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('Error: MONGO_URI is not set in environment.');
      process.exit(1);
    }

    await mongoose.connect(uri);

    const email = process.env.ADMIN_EMAIL || 'admin@campus.edu';
    let password = process.env.ADMIN_PASSWORD;
    let generatedPassword = false;

    if (!password) {
      password = crypto.randomBytes(8).toString('hex') + 'A1!';
      generatedPassword = true;
    }

    let user = await User.findOne({ email });
    if (user) {
      user.role = 'admin';
      user.password = password;
      await user.save();
      console.log(`Successfully updated existing user "${email}" to admin role.`);
    } else {
      user = await User.create({
        name: 'Campus Administrator',
        email,
        password,
        role: 'admin',
        branch: 'Administration',
        year: 5,
      });
      console.log(`Successfully created new admin user "${email}".`);
    }

    if (generatedPassword) {
      console.log('=====================================================');
      console.log('NOTICE: Generated strong one-time admin password:');
      console.log(`  Email:    ${email}`);
      console.log(`  Password: ${password}`);
      console.log('Store this password securely. It will not be printed again.');
      console.log('=====================================================');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin user:', err);
    process.exit(1);
  }
}

createAdmin();
