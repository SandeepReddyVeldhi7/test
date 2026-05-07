import PlatformAdmin from "../../models/PlatformAdmin.model.js";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import generateToken from "../../utils/generateToken.js";
import { sendOtpEmail } from "../../services/email.service.js";
import bcrypt from "bcryptjs";

// @desc    Initial login with email and password
// @route   POST /api/platform/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await PlatformAdmin.findOne({ email }).populate("role");
  if (!admin) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Check if password is a bcrypt hash (starts with $2)
  const isHashed = admin.password.startsWith('$2');
  let isMatch = false;

  if (isHashed) {
    isMatch = await bcrypt.compare(password, admin.password);
  } else {
    // Fallback for plain-text passwords in production
    isMatch = password === admin.password;
    
    // If matched, we'll hash it now by saving the admin
    if (isMatch) {
      admin.password = password; 
      // The pre-save hook we added to the model will now hash this!
    }
  }

  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Finalize login (OTP logic would go here if enabled)
  admin.otp = undefined;
  admin.otpExpiresAt = undefined;
  admin.isOtpVerified = true;
  await admin.save();

  const token = generateToken({ id: admin._id });

  res.status(200).json({
    success: true,
    message: "Login successful (Development Bypass)",
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    }
  });
});

// @desc    Verify OTP for 2nd step
// @route   POST /api/platform/auth/verify-otp
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const admin = await PlatformAdmin.findOne({ email }).populate("role");
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  if (admin.otp !== otp || admin.otpExpiresAt < Date.now()) {
    throw new ApiError(400, "Invalid or expired verification code");
  }

  admin.otp = undefined;
  admin.otpExpiresAt = undefined;
  admin.isOtpVerified = true;
  await admin.save();

  const token = generateToken({ id: admin._id });

  res.status(200).json({
    success: true,
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    }
  });
});

// @desc    Resend OTP
// @route   POST /api/platform/auth/resend-otp
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const admin = await PlatformAdmin.findOne({ email });
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  admin.otp = otp;
  admin.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await admin.save();

  await sendOtpEmail({
    to: admin.email,
    name: admin.name,
    otp: otp,
    companyName: "Finch Axis"
  });

  res.status(200).json({
    success: true,
    message: "New verification code sent"
  });
});

// @desc    Get all platform admins
// @route   GET /api/platform/admins
export const getAllAdmins = asyncHandler(async (req, res) => {
  const admins = await PlatformAdmin.find().populate("role");
  res.status(200).json({
    success: true,
    data: admins
  });
});

// @desc    Create a new platform admin
// @route   POST /api/platform/admins
export const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, mobile, employeeId, roleId } = req.body;

  const adminExists = await PlatformAdmin.findOne({ email });
  if (adminExists) {
    throw new ApiError(400, "Admin with this email already exists");
  }

  const admin = await PlatformAdmin.create({
    name,
    email,
    password, // Password will be hashed by the model pre-save hook
    mobile,
    employeeId,
    role: roleId,
    isOtpVerified: true // Assume verified for manually created admins or send invite
  });

  res.status(201).json({
    success: true,
    data: admin
  });
});

// @desc    Toggle admin status
// @route   PATCH /api/platform/admins/:id/toggle-status
export const toggleAdminStatus = asyncHandler(async (req, res) => {
  const admin = await PlatformAdmin.findById(req.params.id);
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  admin.isActive = !admin.isActive;
  await admin.save();

  res.status(200).json({
    success: true,
    isActive: admin.isActive
  });
});
