import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { submitAchievement, getTargetViewData, submitTarget } from "../controllers/sale.controller.js";

const router = express.Router();

router.use(protect);

router.post("/achievement", submitAchievement);
router.post("/target", submitTarget);
router.get("/target-view", getTargetViewData);

export default router;
