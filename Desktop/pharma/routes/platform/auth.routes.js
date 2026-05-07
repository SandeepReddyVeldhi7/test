import express from "express";
import { login, verifyOtp, resendOtp } from "../../controllers/platform/auth.controller.js";

const router = express.Router();

router.post("/login", login);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

export default router;
