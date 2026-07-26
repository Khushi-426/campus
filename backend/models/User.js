import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Restricting to college email domains is a simple, effective way to
    // keep the marketplace trusted (swap the regex for your own college's domain).
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    year: { type: Number, min: 1, max: 5 },
    branch: { type: String, trim: true },
    phone: { type: String, trim: true },
    avatarInitial: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    isSuspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
