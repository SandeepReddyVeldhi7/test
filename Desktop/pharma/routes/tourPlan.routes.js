import express from "express";
import {
  approveTourPlan,
  createTourPlan,
  deleteTourPlan,
  getApprovalsList,
  getTourPlans,
  updateTourPlan,
  checkFieldPlan
} from "../controllers/tourPlan.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createTourPlan);
router.get("/", protect, getTourPlans);
router.get("/check-field", protect, checkFieldPlan);
router.get("/approvals", protect, getApprovalsList);
router.put("/:id", protect, updateTourPlan);

router.delete("/:id", protect, deleteTourPlan);
router.patch("/:id/approve", protect, approveTourPlan);
export default router;
