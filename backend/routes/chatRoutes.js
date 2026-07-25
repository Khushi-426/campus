const express = require('express');
const router = express.Router();
const { startConversation, getConversations, getMessages } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/start', startConversation);
router.get('/', getConversations);
router.get('/:conversationId/messages', getMessages);

module.exports = router;
