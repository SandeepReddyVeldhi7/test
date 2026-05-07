import express from "express";
import {
  createExpense,
  getMyExpenses,
  updateExpense,
  deleteExpense,
  approveExpense,
  bulkUpsertExpenses,
  getApprovalsList,
  approveOverallExpenses,
  uploadBill,
  getOrganizationalExpenseOverview,
  getAdminClaimsList
} from "../controllers/expense.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { createUploader } from "../middleware/upload.middleware.js";

const router = express.Router();
const upload = createUploader("expenses");

router.get("/approvals", protect, getApprovalsList);
router.post("/approve-overall", protect, approveOverallExpenses);
router.post("/upload-bill", protect, upload.single("bill"), uploadBill);
router.get("/admin/overview", protect, getOrganizationalExpenseOverview);
router.get("/admin/recent", protect, getAdminClaimsList);

router.post("/", protect, createExpense);
router.post("/bulk", protect, bulkUpsertExpenses);
router.get("/my", protect, getMyExpenses);
router.put("/:id", protect, updateExpense);
router.delete("/:id", protect, deleteExpense);
router.patch("/:id/approve", protect, approveExpense);


export default router;
