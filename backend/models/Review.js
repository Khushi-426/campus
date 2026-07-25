import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// Compound unique index: ensures a buyer can only leave 1 review per purchased product thread.
reviewSchema.index({ product: 1, buyer: 1 }, { unique: true });

// Compound index for querying a seller's rating feed sorted newest first.
reviewSchema.index({ seller: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
