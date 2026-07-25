import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One conversation per (product, buyer) pair - prevents duplicate threads
// if the buyer clicks "Chat with seller" twice.
conversationSchema.index({ product: 1, buyer: 1 }, { unique: true });
// Fast lookup of "all my conversations, most recent first" for both roles.
conversationSchema.index({ buyer: 1, lastMessageAt: -1 });
conversationSchema.index({ seller: 1, lastMessageAt: -1 });

export default mongoose.model('Conversation', conversationSchema);
