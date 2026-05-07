import express from "express";
import { login, forgotPassword, verifyOtp, resetPassword, verifyUserOtp, webLogin, changePassword, validateTenant, sendLoginOtp } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/validate-tenant", validateTenant);
router.post("/web-login", webLogin);
router.post("/send-login-otp", sendLoginOtp);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post("/verify-user-otp", verifyUserOtp);
router.post("/change-password", protect, changePassword);

export default router;
