import express from "express";
import { getAllComplaints, updateComplaintStatus } from "../../controllers/platform/complaint.controller.js";

const router = express.Router();

router.get("/", getAllComplaints);
router.patch("/:id/status", updateComplaintStatus);

export default router;
