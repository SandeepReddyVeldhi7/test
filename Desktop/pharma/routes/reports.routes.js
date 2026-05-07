import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getActivityReport,
  getPlansReport,
  exportUserReport,
  exportAllUsersReport,
  getDayReport,
  getDayMapData,
  exportExpenses,
  exportTourPlan,
  exportDCRData,
  exportClients,
  getReviewReport,
  getHRReport,
  getFullAssessmentReport,
  exportFullAssessmentExcel
} from "../controllers/reports.controller.js";

const router = express.Router();

router.get("/activity", protect, getActivityReport);
router.get("/plans", protect, getPlansReport);
router.get("/export/user/:id", protect, exportUserReport);
router.get("/export/all", protect, exportAllUsersReport);
router.get("/day-report", protect, getDayReport);
router.get("/day-map", protect, getDayMapData);
router.get("/export/expenses", protect, exportExpenses);
router.get("/export/tour-plan", protect, exportTourPlan);
router.get("/export/dcr", protect, exportDCRData);
router.get("/export/clients", protect, exportClients);
router.get("/review-report", protect, getReviewReport);
router.get("/hr-report", protect, getHRReport);
router.get("/full-assessment", protect, getFullAssessmentReport);
router.get("/export/full-assessment", protect, exportFullAssessmentExcel);

export default router;
