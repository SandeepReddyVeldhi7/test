import express from "express";
import * as hrController from "../controllers/hr.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { createUploader } from "../middleware/upload.middleware.js";

const edetailingUploader = createUploader("edetailing");

const router = express.Router();

router.use(protect);

// --- HOLIDAY ROUTES ---
router
  .route("/holidays")
  .get(hrController.getHolidays)
  .post(authorizeRoles("super_admin", "admin", "hr", "platform_owner"), hrController.createHoliday);

router
  .route("/holidays/:id")
  .put(authorizeRoles("super_admin", "admin", "hr", "platform_owner"), hrController.updateHoliday)
  .delete(authorizeRoles("super_admin", "admin", "hr", "platform_owner"), hrController.deleteHoliday);

// --- LEAVE ROUTES ---
router.get("/leaves/my", hrController.getMyLeaves);
router.post("/leaves/apply", hrController.applyLeave);
router.get("/leaves/balance", hrController.getLeaveBalances);
router.get("/leaves/pending", hrController.getPendingLeaves);
router.put("/leaves/:id/status", hrController.updateLeaveStatus);

// --- POLICY ROUTES ---
router.get("/policy", hrController.getLeavePolicy);
router.post("/policy", authorizeRoles("super_admin", "admin", "hr", "platform_owner"), hrController.updateLeavePolicy);

// --- E-DETAILING ROUTES ---
router
  .route("/edetailing")
  .get(hrController.getEDetailing)
  .post(authorizeRoles("super_admin", "admin", "hr", "platform_owner"), edetailingUploader.single("file"), hrController.createEDetailing);

router.delete("/edetailing/:id", authorizeRoles("super_admin", "admin", "hr", "platform_owner"), hrController.deleteEDetailing);

export default router;
