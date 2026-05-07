import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  subscribePush,
  getNotifications,
  markRead,
  clearAllNotifications,
  deleteNotification
} from "../controllers/notification.controller.js";

const router = express.Router();

router.post("/subscribe", protect, subscribePush);
router.get("/", protect, getNotifications);
router.put("/read", protect, markRead);
router.delete("/all", protect, clearAllNotifications);
router.delete("/:id", protect, deleteNotification);

export default router;
