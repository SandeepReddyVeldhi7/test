import express from "express";
import {
  getOrCreateOneToOneChat,
  createGroupChat,
  getMyChatRooms,
  sendMessage,
  getMessages,
  markMessagesAsSeen,
  getUnreadCounts,
  sendFileMessage,
  getChatUsers,
  deleteMessages,
  editMessage,
  reactToMessage,
  forwardMessages,
  getRoomDetails,
  leaveGroup,
  removeMember,
  toggleAdminStatus,
  updateGroupDetails,
  updateGroupPhoto,
  addMembers,
  initChatWindow,
  sendMeetingMessage,
  cancelMeeting
} from "../controllers/chat.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { createUploader } from "../middleware/upload.middleware.js";

const router = express.Router();
const upload = createUploader("chats");

router.post("/one-to-one", protect, getOrCreateOneToOneChat);
router.post("/group", protect, createGroupChat);
router.get("/rooms", protect, getMyChatRooms);
router.get("/rooms/:roomId/init", protect, initChatWindow);
router.post("/forward", protect, forwardMessages);
router.get("/rooms/:roomId", protect, getRoomDetails);
router.post("/rooms/leave", protect, leaveGroup);
router.post("/rooms/remove-member", protect, removeMember);
router.post("/rooms/toggle-admin", protect, toggleAdminStatus);
router.post("/rooms/update", protect, updateGroupDetails);
router.post("/rooms/update-photo", protect, upload.single("photo"), updateGroupPhoto);
router.post("/rooms/add-members", protect, addMembers);
router.post("/message", protect, sendMessage);
router.get("/messages/:roomId", protect, getMessages);
router.post("/mark-seen", protect, markMessagesAsSeen);
router.get("/unread-count", protect, getUnreadCounts);
router.get("/users", protect, getChatUsers);
router.post("/delete-messages", protect, deleteMessages);
router.post("/edit-message", protect, editMessage);
router.post("/react", protect, reactToMessage);
router.post("/forward", protect, forwardMessages);
router.post(
  "/send-file",
  protect,
  upload.single("file"),
  sendFileMessage
);

router.post("/meeting", protect, sendMeetingMessage);
router.patch("/meeting/:id/cancel", protect, cancelMeeting);

export default router;
