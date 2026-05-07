import express from "express";
import { getAIInsights, exportAIReport } from "../controllers/ai.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorizeRoles as authorize } from "../middleware/role.middleware.js";

const router = express.Router();

// All AI routes are protected and restricted to company admins
router.post("/query", protect, authorize("admin", "super_admin", "owner", "platform_owner"), getAIInsights);
router.post("/export", protect, authorize("admin", "super_admin", "owner", "platform_owner"), exportAIReport);

export default router;
