const Product = require('../models/Product');
const cache = require('../utils/cache');

// GET /api/products?category=book&search=calculus&minPrice=0&maxPrice=500&page=1&limit=12
exports.getProducts = async (req, res) => {
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
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50); // cap page size

    const filter = { status: 'available' };
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) filter.$text = { $search: search };

    const cacheKey = `products:list:${JSON.stringify(filter)}:${pageNum}:${limitNum}`;
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

    cache.set(cacheKey, payload, 30000); // 30s TTL - short enough to stay fresh
    res.set('X-Cache', 'MISS');
    res.json(payload);
  } catch (err) {
    console.error('Failed to fetch products:', err);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate('seller', 'name year branch email phone');

    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ product });
  } catch (err) {
    console.error('Failed to fetch product:', err);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { title, description, category, price, condition, images } = req.body;
    if (!title || !description || !category || price === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const product = await Product.create({
      title,
      description,
      category,
      price,
      condition,
      images,
      seller: req.user._id,
    });

    cache.delByPrefix('products:list:'); // invalidate stale listing cache
    res.status(201).json({ product });
  } catch (err) {
    console.error('Failed to create product:', err);
    res.status(500).json({ message: 'Failed to create product' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (String(product.seller) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to edit this listing' });
    }

    const allowed = ['title', 'description', 'category', 'price', 'condition', 'images', 'status'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });

    await product.save();
    cache.delByPrefix('products:list:');
    res.json({ product });
  } catch (err) {
    console.error('Failed to update product:', err);
    res.status(500).json({ message: 'Failed to update product' });
  }
};

exports.deleteProduct = async (req, res) => {
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

exports.getMyListings = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user._id }).sort({ createdAt: -1 });
    res.json({ items: products });
  } catch (err) {
    console.error('Failed to fetch your listings:', err);
    res.status(500).json({ message: 'Failed to fetch your listings' });
  }
};
