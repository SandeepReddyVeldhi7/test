import express from "express";
import { createUser, getAccessibleUsers, getMyTeam, sendOtpForUserCreate, verifyOtpAndCreateUser, getAllUsers, getUserById, editUser, deleteUser, updateFcmToken, removeFcmToken, uploadProfilePhoto, getUserProfileStats, getTeamById, syncLocation, getLiveFleet, toggleUserStatus } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { createUploader } from "../middleware/upload.middleware.js";

const profileUploader = createUploader("profiles");

const router = express.Router();

router.post("/", protect, createUser);
router.post("/photo", protect, profileUploader.single("photo"), uploadProfilePhoto);
router.patch("/sync-location", protect, syncLocation);
router.get("/live-fleet", protect, getLiveFleet);
router.post("/fcm-token", protect, updateFcmToken);
router.post("/remove-fcm-token", protect, removeFcmToken);
router.post("/create-direct", protect, createUser);
router.post("/send-create-otp", protect, sendOtpForUserCreate);
router.post("/verify-create-otp", protect, verifyOtpAndCreateUser);
router.get("/accessible", protect, getAccessibleUsers);
router.get("/my-team", protect, getMyTeam);
router.get("/all", protect, getAllUsers);
router.get("/:id", protect, getUserById);
router.get("/profile-stats/:id", protect, getUserProfileStats);
router.get("/team-by-id/:id", protect, getTeamById);
router.put("/:id", protect, editUser);
router.patch("/toggle-status/:id", protect, toggleUserStatus);
router.delete("/:id", protect, deleteUser);

export default router;
