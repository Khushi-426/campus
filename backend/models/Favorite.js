import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  },
  { timestamps: true }
);

// Compound unique index: ensures a user can only favorite a given product once,
// and speeds up "Is product favorited by this user?" queries to O(1) index scan.
favoriteSchema.index({ user: 1, product: 1 }, { unique: true });

// Compound index for user's saved list feed sorted newest-first.
favoriteSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Favorite', favoriteSchema);
