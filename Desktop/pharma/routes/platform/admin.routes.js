import express from "express";
import { getAllAdmins, createAdmin, toggleAdminStatus } from "../../controllers/platform/auth.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect); // All admin routes are protected

router.get("/", getAllAdmins);
router.post("/", createAdmin);
router.patch("/:id/toggle-status", toggleAdminStatus);

export default router;
