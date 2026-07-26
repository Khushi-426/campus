import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const envPath = fs.existsSync(path.resolve('backend/.env'))
  ? path.resolve('backend/.env')
  : fs.existsSync(path.resolve('.env'))
  ? path.resolve('.env')
  : path.resolve(process.cwd(), '.env');

dotenv.config({ path: envPath });

import User from '../models/User.js';
import Product from '../models/Product.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const categories = ['book', 'calculator', 'lab-equipment', 'stationery', 'electronics', 'other'];
const conditions = ['new', 'like-new', 'good', 'fair', 'worn'];

const categoryImages = {
  book: [
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
  ],
  calculator: [
    'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48a?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=600&q=80',
  ],
  'lab-equipment': [
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80',
  ],
  stationery: [
    'https://images.unsplash.com/photo-1585336261026-6757688719d3?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=600&q=80',
  ],
  electronics: [
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80',
  ],
  other: [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',
  ],
};

const catalogue = {
  book: ['Engineering Mathematics by B. S. Grewal', 'Introduction to Algorithms (CLRS)', 'Operating System Concepts (Silberschatz)', 'Digital Signal Processing', 'Microelectronic Circuits', 'Database System Concepts', 'Computer Networks (Tanenbaum)'],
  calculator: ['Casio FX-991ES Plus Non-Programmable', 'Casio FX-991CW ClassWiz Scientific', 'Texas Instruments TI-36X Pro', 'Casio FX-82MS 2nd Gen', 'HP 10bII+ Financial Calculator'],
  'lab-equipment': ['Digital Multimeter Kit w/ Probes', 'Arduino Uno R3 Starter Kit', 'Breadboard and Jumper Wire Pack', 'Precision Vernier Caliper 150mm', 'Soldering Iron Station 60W', 'Raspberry Pi 4 4GB Lab Kit'],
  stationery: ['A4 Engineering Graph Paper Bundle', 'Technical Drawing Instrument Set', 'Project File Folder Pack (10pcs)', 'Hardcover Engineering Notebook', 'Stabilo Boss Highlighter Set'],
  electronics: ['Logitech MX Master Wireless Mouse', 'Anker 7-in-1 USB-C Hub', 'Sony Noise Cancelling Headphones', 'Keychron K2 Mechanical Keyboard', 'Samsung 25W USB-C Adapter', 'WD Elements 1TB External HDD'],
  other: ['Backpack for 15-inch Laptop & Books', 'Pure Cotton College Lab Coat (Size M)', 'Waterproof Scientific Poster Tube', 'Adjustable LED Desk Lamp', 'GATE CS Exam Preparation Cards'],
};

const firstNames = ['Aarav', 'Aditi', 'Arjun', 'Ananya', 'Dev', 'Diya', 'Ishaan', 'Kavya', 'Karan', 'Meera', 'Neel', 'Nisha', 'Pranav', 'Riya', 'Rohan', 'Sana', 'Siddharth', 'Tanvi', 'Varun', 'Zoya', 'Aditya', 'Bhavna', 'Chetan', 'Divya', 'Esha', 'Farhan', 'Gauri', 'Harsh', 'Ira', 'Jatin'];
const branches = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'Chemical'];
const openings = ['Is this still available?', 'Hi! Would you be open to a small negotiation?', 'Could I inspect it on campus this week?', 'I am interested in buying this for next semester.', 'Does it include all the original accessories?'];
const replies = ['Yes, it is available.', 'Sure, that sounds good.', 'I can meet near the library after class.', 'Everything shown in the listing is included.', 'That works for me — please send a time.'];

function pick(values, index) { return values[index % values.length]; }

function getArg(flag, defaultValue) {
  const arg = process.argv.find(a => a.startsWith(`--${flag}=`));
  if (arg) return parseInt(arg.split('=')[1], 10);
  const idx = process.argv.indexOf(`--${flag}`);
  if (idx !== -1 && process.argv[idx + 1]) return parseInt(process.argv[idx + 1], 10);
  return defaultValue;
}

async function seed() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI);

  const isBench = process.argv.includes('--bench');
  const targetProducts = getArg('products', isBench ? 10000 : 500);
  const targetUsers = getArg('users', isBench ? 100 : 30);
  const targetConversations = getArg('conversations', isBench ? 500 : 12);
  const targetMessages = getArg('messages', isBench ? 20000 : 300);

  console.log(`Starting database seed: products=${targetProducts}, users=${targetUsers}, conversations=${targetConversations}, messages=${targetMessages}...`);
  await Promise.all([Message.deleteMany({}), Conversation.deleteMany({}), Product.deleteMany({}), User.deleteMany({})]);

  const password = await bcrypt.hash(process.env.SEED_PASSWORD || 'CampusTradeDev123!', 10);
  
  const userDocs = Array.from({ length: targetUsers }, (_, index) => {
    const fn = firstNames[index % firstNames.length];
    const ln = ['Sharma', 'Patel', 'Reddy', 'Singh', 'Gupta', 'Verma', 'Kumar', 'Joshi', 'Mehta', 'Rao'][index % 10];
    return {
      name: `${fn} ${ln}`,
      email: `user.${index + 1}@campustrade.test`,
      password,
      year: (index % 4) + 1,
      branch: pick(branches, index),
      phone: `9${String(index + 100000000).padStart(9, '0')}`,
      avatarInitial: fn[0],
    };
  });
  const users = await User.insertMany(userDocs);

  const productBatches = [];
  const batchSize = 1000;

  for (let i = 0; i < targetProducts; i += batchSize) {
    const currentBatchSize = Math.min(batchSize, targetProducts - i);
    const batch = Array.from({ length: currentBatchSize }, (_, idx) => {
      const index = i + idx;
      const category = pick(categories, index);
      const item = pick(catalogue[category], index * 3 + Math.floor(index / categories.length));
      const createdAt = new Date(Date.now() - (index * 3 * 60 * 60 * 1000));
      
      const hasImage = index % 7 !== 0;
      let images = [];
      if (hasImage) {
        const pool = categoryImages[category] || categoryImages.other;
        const mainImg = pool[index % pool.length];
        const secondImg = pool[(index + 1) % pool.length];
        images = [mainImg, secondImg];
      }

      return {
        title: index % 3 === 0 ? `${item} — well maintained` : item,
        description: `Used for college coursework and kept in good condition. Great value for students. Pickup available on campus near main library. Item #${index + 1}.`,
        category,
        price: 120 + ((index * 73) % 4200),
        condition: pick(conditions, index * 2),
        seller: users[index % users.length]._id,
        images,
        status: index % 29 === 0 ? 'sold' : index % 17 === 0 ? 'reserved' : 'available',
        viewCount: (index * 19) % 240,
        createdAt,
        updatedAt: createdAt,
      };
    });

    const inserted = await Product.insertMany(batch);
    productBatches.push(...inserted);
  }

  const conversations = [];
  const messages = [];
  const msgsPerConv = Math.max(1, Math.floor(targetMessages / targetConversations));

  for (let index = 0; index < targetConversations; index += 1) {
    const product = productBatches[index % productBatches.length];
    const sellerId = product.seller;
    const buyer = users[(index + 1) % users.length];
    const buyerId = String(buyer._id) === String(sellerId) ? users[(index + 2) % users.length]._id : buyer._id;

    const startedAt = new Date(Date.now() - ((targetConversations - index) * 60 * 60 * 1000));
    const conversation = new Conversation({
      product: product._id,
      buyer: buyerId,
      seller: sellerId,
      lastMessageAt: new Date(startedAt.getTime() + msgsPerConv * 60 * 1000),
    });

    const thread = Array.from({ length: msgsPerConv }, (_, messageIndex) => {
      const isBuyer = messageIndex % 2 === 0;
      const createdAt = new Date(startedAt.getTime() + messageIndex * 60 * 1000);
      return {
        conversation: conversation._id,
        sender: isBuyer ? buyerId : sellerId,
        text: isBuyer ? pick(openings, messageIndex + index) : pick(replies, messageIndex + index),
        readBy: [isBuyer ? buyerId : sellerId],
        createdAt,
        updatedAt: createdAt,
      };
    });

    conversation.lastMessage = thread[thread.length - 1].text;
    conversations.push(conversation);
    messages.push(...thread);
  }

  // Insert conversations and messages in batches if large
  const convBatches = [];
  for (let i = 0; i < conversations.length; i += 500) {
    convBatches.push(conversations.slice(i, i + 500));
  }
  for (const batch of convBatches) {
    await Conversation.insertMany(batch);
  }

  for (let i = 0; i < messages.length; i += 2000) {
    await Message.insertMany(messages.slice(i, i + 2000));
  }

  console.log(`Seeded ${users.length} users, ${productBatches.length} products, ${conversations.length} conversations, and ${messages.length} messages.`);
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});

