import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { updateLocation, getAllUsersLocations, getUserLocationHistory } from "../controllers/location.controller.js";

const router = express.Router();

router.post("/update", protect, updateLocation);
router.get("/all", protect, getAllUsersLocations);
router.get("/history/:userId", protect, getUserLocationHistory);

export default router;
