const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['book', 'calculator', 'lab-equipment', 'stationery', 'electronics', 'other'],
      index: true,
    },
    price: { type: Number, required: true, min: 0, index: true },
    condition: {
      type: String,
      enum: ['new', 'like-new', 'good', 'fair', 'worn'],
      default: 'good',
    },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    images: [{ type: String }], // store as base64/url strings for simplicity
    status: {
      type: String,
      enum: ['available', 'reserved', 'sold'],
      default: 'available',
      index: true,
    },
    // Denormalized counter avoids a COUNT query every time a product card renders
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound index: most list queries filter by status+category and sort by newest.
// This lets Mongo satisfy the query with an index scan instead of a full collection scan.
productSchema.index({ status: 1, category: 1, createdAt: -1 });
// Covers the default newest-first feed when no category has been selected.
productSchema.index({ status: 1, createdAt: -1 });

// Text index powers the search bar (title + description) without needing
// a separate search service like Elasticsearch for a project this size.
productSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
