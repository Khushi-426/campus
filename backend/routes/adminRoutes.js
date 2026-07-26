import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getDashboardStats,
  getUsers,
  toggleSuspendUser,
  deleteUser,
  getListings,
  removeListing,
  createReport,
  getReports,
  updateReportStatus,
  getAdminActions,
} from '../controllers/adminController.js';

const router = express.Router();

// User-facing report creation endpoint
router.post('/reports', protect, createReport);

// All routes below require Authentication + Admin privileges
router.use(protect, adminOnly);

router.get('/dashboard', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:id/suspend', toggleSuspendUser);
router.delete('/users/:id', deleteUser);

router.get('/listings', getListings);
router.delete('/listings/:id', removeListing);

router.get('/reports', getReports);
router.put('/reports/:id', updateReportStatus);

router.get('/audit', getAdminActions);

export default router;
