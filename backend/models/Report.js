import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: { type: String, enum: ['product', 'user'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Report', reportSchema);
