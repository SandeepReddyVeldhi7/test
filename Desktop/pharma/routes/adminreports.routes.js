import { Router } from "express";
import { protect } from "../middleware/auth.middleware.js";
import { 
  exportAdminFullExpenses, 
  exportAdminUserExpenses, 
  getAdminUserAuditData,
  exportTeamPayroll,
  exportSaleAchievement,
  exportAllUsersExpenseSummary,
  exportAllUsersCompensationSummary
} from "../controllers/adminDashboard/adminreports.controller.js";

const router = Router();

router.get("/export-expenses", protect, exportAdminFullExpenses);
router.get("/export-user-expenses", protect, exportAdminUserExpenses);
router.get("/export-sales", protect, exportSaleAchievement);
router.get("/export-payroll", protect, exportTeamPayroll);
router.get("/export-expense-summary", protect, exportAllUsersExpenseSummary);
router.get("/export-compensation-summary", protect, exportAllUsersCompensationSummary);
router.get("/audit-data", protect, getAdminUserAuditData);

export default router;
