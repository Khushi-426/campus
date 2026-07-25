import express from 'express';
import { startConversation, getConversations, getMessages } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/start', startConversation);
router.get('/', getConversations);
router.get('/:conversationId/messages', getMessages);

export default router;
