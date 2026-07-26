import mongoose from 'mongoose';

const adminActionSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
      type: String,
      enum: ['remove_listing', 'suspend_user', 'unsuspend_user', 'delete_user', 'resolve_report', 'dismiss_report'],
      required: true,
    },
    targetType: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

adminActionSchema.index({ createdAt: -1 });

export default mongoose.model('AdminAction', adminActionSchema);
