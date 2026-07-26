import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Favorite from '../models/Favorite.js';
import Report from '../models/Report.js';
import AdminAction from '../models/AdminAction.js';
import cache from '../utils/cache.js';

// GET /api/admin/dashboard - Aggregated System Dashboard Summary
export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      suspendedUsers,
      totalListings,
      listings7Days,
      listings30Days,
      statusCounts,
      categoryCounts,
      pendingReportsCount,
      mostFavorited,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isSuspended: true }),
      Product.countDocuments(),
      Product.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Product.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Product.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      Report.countDocuments({ status: 'pending' }),
      Favorite.aggregate([
        { $group: { _id: '$product', favCount: { $sum: 1 } } },
        { $sort: { favCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productDetails',
          },
        },
        { $unwind: '$productDetails' },
        {
          $project: {
            _id: 1,
            favCount: 1,
            title: '$productDetails.title',
            price: '$productDetails.price',
            category: '$productDetails.category',
          },
        },
      ]),
    ]);

    const statusMap = { available: 0, reserved: 0, sold: 0 };
    statusCounts.forEach((s) => {
      if (s._id) statusMap[s._id] = s.count;
    });

    const categoryMap = {};
    categoryCounts.forEach((c) => {
      if (c._id) categoryMap[c._id] = c.count;
    });

    res.json({
      users: {
        total: totalUsers,
        active: totalUsers - suspendedUsers,
        suspended: suspendedUsers,
      },
      listings: {
        total: totalListings,
        byStatus: statusMap,
        byCategory: categoryMap,
        createdLast7Days: listings7Days,
        createdLast30Days: listings30Days,
      },
      reports: {
        pending: pendingReportsCount,
      },
      mostFavoritedItems: mostFavorited,
    });
  } catch (err) {
    console.error('Admin dashboard stats error:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
};

// GET /api/admin/users - Search, filter, and paginate all users
export const getUsers = async (req, res) => {
  try {
    const { search, role, isSuspended, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (isSuspended !== undefined && isSuspended !== '') {
      filter.isSuspended = isSuspended === 'true';
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('Admin getUsers error:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// PUT /api/admin/users/:id/suspend - Suspend or reinstate user account
export const toggleSuspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Administrative safety action' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot suspend an administrator account' });
    }

    user.isSuspended = !user.isSuspended;
    await user.save();

    const actionName = user.isSuspended ? 'suspend_user' : 'unsuspend_user';
    await AdminAction.create({
      admin: req.user._id,
      action: actionName,
      targetType: 'user',
      targetId: user._id,
      reason,
    });

    res.json({ message: `User ${user.isSuspended ? 'suspended' : 'reinstated'} successfully`, user });
  } catch (err) {
    console.error('Admin toggleSuspendUser error:', err);
    res.status(500).json({ message: 'Failed to update user status' });
  }
};

// DELETE /api/admin/users/:id - Delete user account with cascade handling for listings
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Account deletion by admin' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete an administrator account' });
    }

    // Cascade handling: delete user's products and favorites cleanly
    await Promise.all([
      Product.deleteMany({ seller: user._id }),
      Favorite.deleteMany({ user: user._id }),
      user.deleteOne(),
    ]);

    cache.delByPrefix('products:list:');

    await AdminAction.create({
      admin: req.user._id,
      action: 'delete_user',
      targetType: 'user',
      targetId: id,
      reason,
    });

    res.json({ message: 'User account and associated listings deleted successfully' });
  } catch (err) {
    console.error('Admin deleteUser error:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// GET /api/admin/listings - View all listings across all sellers
export const getListings = async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) filter.$text = { $search: search };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('seller', 'name email year branch')
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      items,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('Admin getListings error:', err);
    res.status(500).json({ message: 'Failed to fetch listings' });
  }
};

// DELETE /api/admin/listings/:id - Remove/unpublish listing with required reason logged
export const removeListing = async (req, res) => {
  try {
    const { id } = req.params;
    const reason = (req.body && req.body.reason) || req.query?.reason || req.body?.data?.reason;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason is required for removing a listing' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Listing not found' });

    await product.deleteOne();
    cache.delByPrefix('products:list:');

    await AdminAction.create({
      admin: req.user._id,
      action: 'remove_listing',
      targetType: 'product',
      targetId: id,
      reason: reason.trim(),
    });

    res.json({ message: 'Listing removed successfully' });
  } catch (err) {
    console.error('Admin removeListing error:', err);
    res.status(500).json({ message: 'Failed to remove listing' });
  }
};

// POST /api/reports - Create a policy violation report (user-facing endpoint)
export const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ message: 'Missing required report fields' });
    }

    const report = await Report.create({
      reporter: req.user._id,
      targetType,
      targetId,
      reason,
    });

    res.status(201).json({ message: 'Report submitted successfully for admin review', report });
  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json({ message: 'Failed to submit report' });
  }
};

// GET /api/admin/reports - View flagged/reported items or users
export const getReports = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('reporter', 'name email')
        .lean(),
      Report.countDocuments(filter),
    ]);

    res.json({ reports, page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('Admin getReports error:', err);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
};

// PUT /api/admin/reports/:id - Update status of a report (resolved / dismissed)
export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason = 'Report review complete' } = req.body;

    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Status must be resolved or dismissed' });
    }

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = status;
    await report.save();

    const actionName = status === 'resolved' ? 'resolve_report' : 'dismiss_report';
    await AdminAction.create({
      admin: req.user._id,
      action: actionName,
      targetType: 'report',
      targetId: report._id,
      reason,
    });

    res.json({ message: `Report marked as ${status}`, report });
  } catch (err) {
    console.error('Admin updateReportStatus error:', err);
    res.status(500).json({ message: 'Failed to update report status' });
  }
};

// GET /api/admin/audit - Audit trail of admin actions
export const getAdminActions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [actions, total] = await Promise.all([
      AdminAction.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('admin', 'name email')
        .lean(),
      AdminAction.countDocuments(),
    ]);

    res.json({ actions, page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('Admin getAdminActions error:', err);
    res.status(500).json({ message: 'Failed to fetch admin audit log' });
  }
};
