import express from "express";
import { createActivity, getActivities } from "../controllers/activities.controller.js";
import { getDCRApprovalsList, approveDCRDay } from "../controllers/dcrApproval.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { createUploader } from "../middleware/upload.middleware.js";



const router = express.Router();
const upload = createUploader("activities");

// ✅ APPROVALS
router.get("/approvals", protect, getDCRApprovalsList);
router.patch("/approve-day", protect, approveDCRDay);

// ✅ CREATE
router.post("/", protect, upload.single("photo"), createActivity);

// ✅ GET ALL
router.get("/", protect, getActivities);


export default router;