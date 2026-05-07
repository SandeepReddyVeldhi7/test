import express from "express";
import * as payrollController from "../controllers/adminDashboard/payroll.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("super_admin", "admin", "hr", "platform_owner"));

router.get("/admin-overview", payrollController.getAdminPayrollOverview);
router.get("/admin-list", payrollController.getAdminPayrollList);

export default router;
