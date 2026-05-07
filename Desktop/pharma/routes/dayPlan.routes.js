import express from "express";
import { createDayPlan, getMyDayPlan } from "../controllers/dayPlan.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, createDayPlan);
router.get("/my", protect, getMyDayPlan);
export default router;
