import express from "express";
import { getMonthlyStats, getPendingApprovalsSummary } from "../controllers/dashboard.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/monthly", protect, getMonthlyStats);
router.get("/approvals-summary", protect, getPendingApprovalsSummary);

export default router;
