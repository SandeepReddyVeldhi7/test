import express from "express";
import { getPlatformStats } from "../../controllers/platform/company.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getPlatformStats);

export default router;
