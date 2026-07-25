import rateLimit from 'express-rate-limit';

// Protects auth endpoints from brute-force login attempts.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// A generous global limiter so a single client can't hammer the API
// and starve other users of throughput (basic DoS mitigation).
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { message: 'Too many requests, slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
