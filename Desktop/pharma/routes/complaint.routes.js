import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
    createComplaint,
    getEmployeeComplaints,
} from "../controllers/complaint.controller.js";

const router = express.Router();

router.post("/", protect, createComplaint);
router.get("/me", protect, getEmployeeComplaints);

export default router;
