import express from 'express';
import { protect } from '../middleware/auth.js';
import { toggleFavorite, getMyFavorites, getMyFavoriteIds } from '../controllers/favoriteController.js';

const router = express.Router();

router.get('/', protect, getMyFavorites);
router.get('/ids', protect, getMyFavoriteIds);
router.post('/:productId', protect, toggleFavorite);

export default router;
