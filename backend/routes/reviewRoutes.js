import express from 'express';
import { protect } from '../middleware/auth.js';
import { createReview, getSellerReviews } from '../controllers/reviewController.js';

const router = express.Router();

router.post('/', protect, createReview);
router.get('/seller/:sellerId', getSellerReviews);

export default router;
