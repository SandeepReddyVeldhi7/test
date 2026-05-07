import express from "express";
import { getTerritories } from "../controllers/territoryController.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// GET /territories
router.get("/", protect, getTerritories);

export default router;