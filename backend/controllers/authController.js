const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sanitize = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  year: user.year,
  branch: user.branch,
  phone: user.phone,
});

exports.register = async (req, res) => {
  try {
    const { name, email, password, year, branch, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, year, branch, phone });
    const token = signToken(user._id);

    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    console.error('Registration failed:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ message: 'Login failed' });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: sanitize(req.user) });
};
