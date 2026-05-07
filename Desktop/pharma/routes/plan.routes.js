import express from "express";
import { createPlan, deletePlan, getPlans, updatePlan } from "../controllers/platform/plan.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();
// authorizeRoles("OWNER"),
router.post("/", protect, createPlan);
router.get("/", protect, getPlans);
router.put("/", protect, updatePlan);
router.delete("/", protect, deletePlan);

export default router;
