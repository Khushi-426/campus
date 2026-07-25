import Review from '../models/Review.js';
import Conversation from '../models/Conversation.js';
import Product from '../models/Product.js';
import Notification from '../models/Notification.js';

// POST /api/reviews - Add seller review for a product
export const createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const buyerId = req.user._id;

    if (!productId || !rating || !comment) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Enforce Rule: Must have an active chat thread for this (product, buyer) pair to leave a review
    const chatExists = await Conversation.findOne({ product: productId, buyer: buyerId });
    if (!chatExists) {
      return res.status(403).json({
        message: 'Review forbidden: You can only review sellers after starting a chat thread for this listing.',
      });
    }

    const existingReview = await Review.findOne({ product: productId, buyer: buyerId });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this transaction' });
    }

    const review = await Review.create({
      product: productId,
      seller: product.seller,
      buyer: buyerId,
      rating: Number(rating),
      comment,
    });

    // Send Notification to Seller
    await Notification.create({
      recipient: product.seller,
      product: productId,
      type: 'new_review',
      message: `${req.user.name} left a ${rating}-star review for "${product.title}"`,
    });

    res.status(201).json({ review });
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ message: 'Failed to create review' });
  }
};

// GET /api/reviews/seller/:sellerId - Get reviews for a seller
export const getSellerReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ seller: req.params.sellerId })
      .sort({ createdAt: -1 })
      .populate('buyer', 'name year branch')
      .populate('product', 'title')
      .lean();

    const total = reviews.length;
    const avgRating = total > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / total).toFixed(1) : 0;

    res.json({ reviews, total, avgRating: Number(avgRating) });
  } catch (err) {
    console.error('Fetch reviews error:', err);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};
