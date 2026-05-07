import express from "express";
import {
  createDashboardUser,
  getAllDashboardUsers,
  getDashboardUserById,
  updateDashboardUser,
  deleteDashboardUser
} from "../controllers/adminDashboard/dashboardUser.controller.js";
import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);
router.use(isAdmin);

router.route("/")
  .get(getAllDashboardUsers)
  .post(createDashboardUser);

router.route("/:id")
  .get(getDashboardUserById)
  .put(updateDashboardUser)
  .delete(deleteDashboardUser);

export default router;
