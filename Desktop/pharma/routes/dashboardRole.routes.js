import express from "express";
import {
  createDashboardRole,
  getDashboardRoles,
  updateDashboardRole,
  deleteDashboardRole
} from "../controllers/adminDashboard/dashboardRole.controller.js";
import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);
router.use(isAdmin);

router.route("/")
  .get(getDashboardRoles)
  .post(createDashboardRole);

router.route("/:roleId")
  .put(updateDashboardRole)
  .delete(deleteDashboardRole);

export default router;
