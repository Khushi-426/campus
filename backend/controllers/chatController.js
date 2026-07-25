import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Product from '../models/Product.js';

// POST /api/chat/start  { productId }
// Buyer clicks "Chat with seller" -> find or create the thread.
export const startConversation = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (String(product.seller) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't message yourself about your own listing" });
    }

    // Atomic upsert prevents concurrent "start chat" requests from creating
    // duplicate threads. The unique { product, buyer } index remains the
    // database-level guardrail.
    const conversation = await Conversation.findOneAndUpdate(
      { product: productId, buyer: req.user._id },
      {
        $setOnInsert: {
          product: productId,
          buyer: req.user._id,
          seller: product.seller,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ conversation });
  } catch (err) {
    console.error('Failed to start conversation:', err);
    res.status(500).json({ message: 'Failed to start conversation' });
  }
};

// GET /api/chat  -> all conversations for the logged-in user (as buyer or seller)
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      $or: [{ buyer: req.user._id }, { seller: req.user._id }],
    })
      .sort({ lastMessageAt: -1 })
      .populate('product', 'title price images status')
      .populate('buyer', 'name')
      .populate('seller', 'name');

    res.json({ items: conversations });
  } catch (err) {
    console.error('Failed to fetch conversations:', err);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

// GET /api/chat/:conversationId/messages?before=<timestamp>&limit=30
// Cursor-based pagination (by createdAt) - scales better than page/skip for chat history.
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, limit = 30 } = req.query;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const isParticipant =
      String(conversation.buyer) === String(req.user._id) ||
      String(conversation.seller) === String(req.user._id);
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    const query = { conversation: conversationId };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit), 100))
      .populate('sender', 'name');

    res.json({ items: messages.reverse() }); // oldest -> newest for rendering
  } catch (err) {
    console.error('Failed to fetch messages:', err);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};
