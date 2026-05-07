import express from 'express';
import { 
  getAdminDashboardStats, 
  getTeamHierarchy, 
  getUsersMapData, 
  exportDashboardData 
} from '../controllers/adminDashboard/adminDashboard.controller.js';
import { protect, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes are protected by token and admin check
router.get('/dashboard', protect, isAdmin, getAdminDashboardStats);
router.get('/hierarchy', protect, isAdmin, getTeamHierarchy);
router.get('/users-map', protect, isAdmin, getUsersMapData);
router.get('/dashboard/export', protect, isAdmin, exportDashboardData);

export default router;
