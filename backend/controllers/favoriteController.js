import Favorite from '../models/Favorite.js';
import Product from '../models/Product.js';

// POST /api/favorites/:productId - Toggle favorite (star / unstar)
export const toggleFavorite = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const existing = await Favorite.findOne({ user: userId, product: productId });
    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
      return res.json({ favorited: false, message: 'Removed from watchlist' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await Favorite.create({ user: userId, product: productId });
    res.json({ favorited: true, message: 'Added to watchlist' });
  } catch (err) {
    console.error('Toggle favorite error:', err);
    res.status(500).json({ message: 'Failed to toggle favorite' });
  }
};

// GET /api/favorites - Get logged in user's saved items
export const getMyFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'product',
        populate: { path: 'seller', select: 'name year branch' },
      })
      .lean();

    const items = favorites.filter((f) => f.product).map((f) => f.product);
    res.json({ items });
  } catch (err) {
    console.error('Fetch favorites error:', err);
    res.status(500).json({ message: 'Failed to fetch saved items' });
  }
};

// GET /api/favorites/ids - Get array of favorited product IDs for fast UI heart toggle checks
export const getMyFavoriteIds = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id }).select('product').lean();
    const ids = favorites.map((f) => String(f.product));
    res.json({ ids });
  } catch (err) {
    console.error('Fetch favorite IDs error:', err);
    res.status(500).json({ message: 'Failed to fetch favorite IDs' });
  }
};
