import fs from 'fs';
import path from 'path';
import Product from '../models/Product.js';
import Favorite from '../models/Favorite.js';
import Conversation from '../models/Conversation.js';
import Notification from '../models/Notification.js';
import cache from '../utils/cache.js';

// In-Memory Session/IP View Deduplication Store (10 min TTL)
const viewDedupeStore = new Map();
const DEDUPE_TTL_MS = 600000;

function isDuplicateView(ip, productId) {
  const key = `${ip}:${productId}`;
  const now = Date.now();
  const lastView = viewDedupeStore.get(key);
  if (lastView && now - lastView < DEDUPE_TTL_MS) {
    return true;
  }
  viewDedupeStore.set(key, now);
  // Periodic cleanup if store exceeds 10,000 keys
  if (viewDedupeStore.size > 10000) {
    for (const [k, time] of viewDedupeStore.entries()) {
      if (now - time > DEDUPE_TTL_MS) viewDedupeStore.delete(k);
    }
  }
  return false;
}

// Helper to save base64 strings to local disk static files in uploads/
function saveBase64ImageToDisk(base64Str) {
  if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const matches = base64Str.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches) return base64Str;

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const dataBuffer = Buffer.from(matches[2], 'base64');
    const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, dataBuffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Failed to save image to disk:', err);
    return base64Str;
  }
}

// Helper for deterministic sorted filter cache keys
function buildNormalizedCacheKey(filter, pageNum, limitNum) {
  const sortedKeys = Object.keys(filter).sort();
  const sortedFilterObj = {};
  sortedKeys.forEach((k) => {
    sortedFilterObj[k] = filter[k];
  });
  return `products:list:${JSON.stringify(sortedFilterObj)}:${pageNum}:${limitNum}`;
}

// GET /api/products?category=book&search=calculus&minPrice=0&maxPrice=500&page=1&limit=12
export const getProducts = async (req, res) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      page = 1,
      limit = 12,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);

    const filter = { status: 'available' };
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    const cacheKey = buildNormalizedCacheKey(filter, pageNum, limitNum);
    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('seller', 'name year branch')
        .lean(),
      Product.countDocuments(filter),
    ]);

    const payload = {
      items,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    };

    cache.set(cacheKey, payload, 30000);
    res.set('X-Cache', 'MISS');
    res.json(payload);
  } catch (err) {
    console.error('Failed to fetch products:', err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

// GET /api/products/:id - Optimized viewCount increment with IP deduplication & fire-and-forget write
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name year branch email phone')
      .lean();

    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Deduplicate view increments by client IP / Session to prevent view inflation on refresh
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    if (!isDuplicateView(clientIp, req.params.id)) {
      // Fire-and-forget increment without blocking response path
      Product.updateOne({ _id: req.params.id }, { $inc: { viewCount: 1 } }).exec();
    }

    res.json({ product });
  } catch (err) {
    console.error('Failed to fetch product:', err);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
};

// POST /api/products - Offload base64 images to static disk files
export const createProduct = async (req, res) => {
  try {
    const { title, description, category, price, condition, images = [] } = req.body;
    if (!title || !description || !category || price === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Process image array to disk static URLs
    const processedImages = images.map((img) => saveBase64ImageToDisk(img));

    const product = await Product.create({
      title,
      description,
      category,
      price,
      condition,
      images: processedImages,
      seller: req.user._id,
    });

    cache.delByPrefix('products:list:');
    res.status(201).json({ product });
  } catch (err) {
    console.error('Failed to create product:', err);
    res.status(500).json({ message: 'Failed to create product' });
  }
};

// PUT /api/products/:id - Update product & trigger notifications (price drop / item sold)
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (String(product.seller) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to edit this listing' });
    }

    const oldPrice = product.price;
    const oldStatus = product.status;

    const allowed = ['title', 'description', 'category', 'price', 'condition', 'images', 'status'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'images' && Array.isArray(req.body.images)) {
          product.images = req.body.images.map((img) => saveBase64ImageToDisk(img));
        } else {
          product[field] = req.body[field];
        }
      }
    });

    await product.save();
    cache.delByPrefix('products:list:');

    // Notification Trigger 1: Price Drop Alert to Favoriting Buyers
    if (req.body.price !== undefined && Number(req.body.price) < oldPrice) {
      const favorites = await Favorite.find({ product: product._id }).select('user').lean();
      const notifs = favorites.map((f) => ({
        recipient: f.user,
        product: product._id,
        type: 'price_drop',
        message: `Price Drop! "${product.title}" is now available for ₹${product.price} (was ₹${oldPrice}).`,
      }));
      if (notifs.length > 0) {
        await Notification.insertMany(notifs);
      }
    }

    // Notification Trigger 2: Mark as Sold Flow to Active Chat Buyers
    if (req.body.status === 'sold' && oldStatus !== 'sold') {
      const conversations = await Conversation.find({ product: product._id }).select('buyer').lean();
      const notifs = conversations.map((c) => ({
        recipient: c.buyer,
        product: product._id,
        type: 'item_sold',
        message: `The item "${product.title}" you were inquiring about has been marked as SOLD by the seller.`,
      }));
      if (notifs.length > 0) {
        await Notification.insertMany(notifs);
      }
    }

    // Notification Trigger 3: Back in Stock Alert
    if (oldStatus === 'sold' && req.body.status === 'available') {
      const favorites = await Favorite.find({ product: product._id }).select('user').lean();
      const notifs = favorites.map((f) => ({
        recipient: f.user,
        product: product._id,
        type: 'item_back_in_stock',
        message: `"${product.title}" is back in stock and available for purchase!`,
      }));
      if (notifs.length > 0) {
        await Notification.insertMany(notifs);
      }
    }

    res.json({ product });
  } catch (err) {
    console.error('Failed to update product:', err);
    res.status(500).json({ message: 'Failed to update product' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (String(product.seller) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this listing' });
    }

    await product.deleteOne();
    cache.delByPrefix('products:list:');
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    console.error('Failed to delete product:', err);
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

export const getMyListings = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user._id }).sort({ createdAt: -1 });
    res.json({ items: products });
  } catch (err) {
    console.error('Failed to fetch your listings:', err);
    res.status(500).json({ message: 'Failed to fetch your listings' });
  }
};
