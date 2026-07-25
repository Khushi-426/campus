require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const categories = ['book', 'calculator', 'lab-equipment', 'stationery', 'electronics', 'other'];
const conditions = ['new', 'like-new', 'good', 'fair', 'worn'];
const catalogue = {
  book: ['Engineering Mathematics by B. S. Grewal', 'Introduction to Algorithms', 'Operating System Concepts', 'Digital Signal Processing', 'Microelectronic Circuits', 'Database System Concepts', 'Computer Networks'],
  calculator: ['Casio FX-991ES Plus', 'Casio FX-991CW Scientific Calculator', 'Texas Instruments TI-36X Pro', 'Casio FX-82MS', 'HP 10bII+ Financial Calculator'],
  'lab-equipment': ['Digital Multimeter Kit', 'Arduino Uno Starter Kit', 'Breadboard and Jumper Wire Set', 'Vernier Caliper', 'Soldering Iron Station', 'Raspberry Pi 4 Kit'],
  stationery: ['A4 Graph Paper Bundle', 'Technical Drawing Instrument Set', 'Project File Folder Pack', 'Engineering Notebook Set', 'Highlighter and Pen Set'],
  electronics: ['Logitech Wireless Mouse', 'USB-C Hub', 'Noise Cancelling Headphones', 'Mechanical Keyboard', 'Samsung 25W Power Adapter', 'External Hard Drive 1TB'],
  other: ['Backpack for 15-inch Laptop', 'College Lab Coat', 'Scientific Poster Tube', 'Desk Lamp', 'Exam Preparation Flashcards'],
};
const firstNames = ['Aarav', 'Aditi', 'Arjun', 'Ananya', 'Dev', 'Diya', 'Ishaan', 'Kavya', 'Karan', 'Meera', 'Neel', 'Nisha', 'Pranav', 'Riya', 'Rohan', 'Sana', 'Siddharth', 'Tanvi', 'Varun', 'Zoya', 'Aditya', 'Bhavna', 'Chetan', 'Divya', 'Esha', 'Farhan', 'Gauri', 'Harsh', 'Ira', 'Jatin'];
const branches = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical', 'Chemical'];
const openings = ['Is this still available?', 'Hi! Would you be open to a small negotiation?', 'Could I inspect it on campus this week?', 'I am interested in buying this for next semester.', 'Does it include all the original accessories?'];
const replies = ['Yes, it is available.', 'Sure, that sounds good.', 'I can meet near the library after class.', 'Everything shown in the listing is included.', 'That works for me — please send a time.'];

function pick(values, index) { return values[index % values.length]; }

async function seed() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([Message.deleteMany({}), Conversation.deleteMany({}), Product.deleteMany({}), User.deleteMany({})]);

  const password = await bcrypt.hash(process.env.SEED_PASSWORD || 'CampusTradeDev123!', 10);
  const users = await User.insertMany(firstNames.map((name, index) => ({
    name: `${name} ${['Sharma', 'Patel', 'Reddy', 'Singh', 'Gupta'][index % 5]}`,
    email: `${name.toLowerCase()}.${index + 1}@campustrade.test`, password,
    year: (index % 4) + 1, branch: pick(branches, index),
    phone: `90000${String(index).padStart(5, '0')}`, avatarInitial: name[0],
  })));

  const products = await Product.insertMany(Array.from({ length: 500 }, (_, index) => {
    const category = pick(categories, index);
    const item = pick(catalogue[category], index * 3 + Math.floor(index / categories.length));
    const createdAt = new Date(Date.now() - (index * 3 * 60 * 60 * 1000));
    return { title: index % 3 === 0 ? `${item} — well maintained` : item,
      description: `Used for coursework and kept in good condition. Available for pickup on campus. Listing ${index + 1}.`,
      category, price: 120 + ((index * 73) % 4200), condition: pick(conditions, index * 2),
      seller: users[index % users.length]._id, images: [],
      status: index % 29 === 0 ? 'sold' : index % 17 === 0 ? 'reserved' : 'available', viewCount: (index * 19) % 240,
      createdAt, updatedAt: createdAt };
  }));

  const conversations = [];
  const messages = [];
  for (let index = 0; index < 12; index += 1) {
    const product = products[index * 7];
    const buyer = users[(index + 11) % users.length];
    const messageCount = 20 + ((index * 7) % 31);
    const startedAt = new Date(Date.now() - ((14 - index) * 24 * 60 * 60 * 1000));
    const conversation = new Conversation({ product: product._id, buyer: buyer._id, seller: product.seller,
      lastMessageAt: new Date(startedAt.getTime() + messageCount * 8 * 60 * 1000) });
    const thread = Array.from({ length: messageCount }, (_, messageIndex) => {
      const isBuyer = messageIndex % 2 === 0;
      const createdAt = new Date(startedAt.getTime() + messageIndex * 8 * 60 * 1000);
      return { conversation: conversation._id, sender: isBuyer ? buyer._id : product.seller,
        text: isBuyer ? pick(openings, messageIndex + index) : pick(replies, messageIndex + index),
        readBy: [isBuyer ? buyer._id : product.seller], createdAt, updatedAt: createdAt };
    });
    conversation.lastMessage = thread[thread.length - 1].text;
    conversations.push(conversation); messages.push(...thread);
  }
  await Conversation.insertMany(conversations);
  await Message.insertMany(messages);
  console.log(`Seeded ${users.length} users, ${products.length} products, ${conversations.length} conversations, and ${messages.length} messages.`);
  await mongoose.disconnect();
}

seed().catch(async (error) => { console.error('Seed failed:', error); await mongoose.disconnect(); process.exitCode = 1; });
