import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Company, PlatformAdmin, User, DCR, Client, MonthlyTarget, MonthlyAchievement, Expense, DashboardUser, DashboardRole } from "../models/index.js";
import { sendOtpEmail } from "../services/email.service.js";
import bcrypt from "bcryptjs";

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

export const login = asyncHandler(async (req, res) => {
  const identifier = req.body.identifier?.trim();
  const secret = req.body.secret?.trim();
  const password = req.body.password?.trim();

  console.log("Login attempt:", { identifier, secret });





  // ---------- OWNER LOGIN ----------
  if (identifier.includes("@")) {
    const owner = await PlatformAdmin.findOne({ email: identifier }).populate("role");
    if (!owner) {
      throw new ApiError(401, "Invalid email");
    }

    if (!password) {
      throw new ApiError(400, "Password is required");
    }

    // Migration Logic: Check if password is a bcrypt hash
    const isHashed = owner.password.startsWith('$2');
    let isMatch = false;

    if (isHashed) {
      isMatch = await bcrypt.compare(password, owner.password);
    } else {
      isMatch = password === owner.password;
      if (isMatch) {
        owner.password = password; // Trigger hashing hook
        await owner.save();
      }
    }

    if (!isMatch) {
      throw new ApiError(401, "Invalid credentials");
    }

    const token = generateToken({
      id: owner._id,
      role: "OWNER",
      type: "PLATFORM",
    });

    return res.json({
      token,
      user: {
        _id: owner._id,
        name: owner.name,
        email: owner.email,
        roleId: owner.role,
        companyId: owner.companyId
      },
      role: "OWNER",
    });
  }


  // ---------- EMPLOYEE LOGIN ----------
  const company = await Company.findOne({
    code: identifier.toUpperCase(),
  });

  if (!company) {
    throw new ApiError(404, "Invalid company code");
  }

  if (company.status !== "ACTIVE") {
    throw new ApiError(403, "Company account inactive");
  }

  // ✅ FIX: include companyId
  const user = await User.findOne({
    companyId: company._id,
    employeeId: secret.toUpperCase(),
  }).populate({
    path: "roleId",
    select: "name permissions level",
  }).populate({
    path: "companyId",
    populate: { path: "plan", select: "permissions" }
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // ✅ check password exists
  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  // ✅ compare password
  const isMatch = await bcrypt.compare(password, user.password);
  console.log("isMatch", isMatch)
  if (!isMatch) {
    throw new ApiError(401, "Invalid password");
  }

  // ✅ generate token
  const token = generateToken({
    _id: user._id,
    roleId: user.roleId._id,
    permissions: user.roleId.permissions,
    companyId: user.companyId,
    type: "COMPANY",
  });

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      employeeId: user.employeeId,
      companyId: user.companyId?._id,
      companyName: user.companyId?.name,
      planPermissions: user.companyId?.plan?.permissions || [],
      permissions: user.roleId?.permissions || [],
      scope: user.roleId?.name || "USER",
      designation: user.designation,
      photo: user.photo,
      status: user.isActive ? 'active' : 'inactive',
      mustChangePassword: user.mustChangePassword,
      area: user.area || "",
      subArea: user.subArea || [],
      dailyAllowance: user.dailyAllowance,
    },
  });

});



export const validateTenant = asyncHandler(async (req, res) => {
  const { webUrl, accessKey } = req.body;

  if (!webUrl || !accessKey) {
    throw new ApiError(400, "Web URL and Access Key are required to connect to workspace.");
  }

  // Normalize inputs just in case spaces happen on mobile
  let normalizedUrl = webUrl.trim().toLowerCase();

  // Strip protocol and www if user pasted them
  normalizedUrl = normalizedUrl.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");

  const normalizedKey = accessKey.trim().toUpperCase();

  const company = await Company.findOne({
    webUrl: normalizedUrl,
    accessKey: normalizedKey
  });

  if (!company) {
    throw new ApiError(404, "Invalid Workspace Credentials. Please double-check your initial email.");
  }

  if (company.status !== "ACTIVE") {
    throw new ApiError(403, "This Workspace has been suspended or expired.");
  }

  // Return strictly non-sensitive branding info so the app can configure itself
  return res.json({
    success: true,
    data: {
      companyId: company._id,
      name: company.name,
      code: company.code,
      logoUrl: company.logoUrl,
      webUrl: company.webUrl
    }
  });
});



export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Find user and populate manager details
  const user = await User.findOne({ email }).populate("managerId", "email name");
  if (!user) throw new ApiError(404, "User not found");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = await bcrypt.hash(otp, 10);
  user.otpExpiresAt = Date.now() + 10 * 60 * 1000;

  await user.save();

  // Determine recipient: Manager's email if available, else user's email
  const recipientEmail = (user.managerId && user.managerId.email) ? user.managerId.email : email;
  const isSentToManager = (user.managerId && user.managerId.email);

  await sendOtpEmail({
    to: recipientEmail,
    name: user.name, // The user's name so the manager knows who it is for
    otp: otp,
  });

  res.json({
    success: true,
    message: isSentToManager
      ? "OTP sent to your manager's registered email"
      : "OTP sent to your email"
  });
});


export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user || !user.otp) throw new ApiError(400, "OTP not found");

  if (user.otpExpiresAt < Date.now()) {
    throw new ApiError(400, "OTP expired");
  }

  const valid = await bcrypt.compare(otp, user.otp);
  if (!valid) throw new ApiError(400, "Invalid OTP");

  res.json({ success: true, message: "OTP verified" });
});



export const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  const user = await User.findOne({ email });

  // block reuse
  for (let oldHash of user.passwordHistory) {
    const same = await bcrypt.compare(newPassword, oldHash);
    if (same) throw new ApiError(400, "You cannot reuse old password");
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  user.password = hashed;
  user.passwordHistory.push(hashed);

  if (user.passwordHistory.length > 5) {
    user.passwordHistory.shift(); // keep last 5
  }

  user.otp = null;
  user.otpExpiresAt = null;

  await user.save();

  res.json({ success: true, message: "Password reset successful" });
});



export const verifyUserOtp = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  if (!user.otp || user.otpExpiresAt < Date.now()) {
    throw new ApiError(400, "OTP expired");
  }

  const valid = await bcrypt.compare(otp, user.otp);
  if (!valid) throw new ApiError(400, "Invalid OTP");

  user.isVerified = true;
  user.otp = null;
  user.otpExpiresAt = null;

  await user.save();

  res.json({ success: true, message: "User verified successfully" });
});

/**
 * @desc  Web dashboard login (email + password) for Super Admin and HR
 * @route POST /api/auth/web-login
 */
export const webLogin = asyncHandler(async (req, res) => {
  const { identifier, secret, password } = req.body;

  if (!identifier || !secret || !password) {
    throw new ApiError(400, "All fields are required");
  }

  // 1. Find Company
  const company = await Company.findOne({ code: identifier.toUpperCase() });
  console.log(company);
  if (!company) {
    throw new ApiError(400, "Invalid company code or inactive organization");
  }

  // 2. Find User within this company (Dashboard User context)
  const user = await DashboardUser.findOne({
    companyId: company._id,
    employeeId: secret.toUpperCase(),
    isActive: true
  })
    .populate("roleId", "name level permissions")
    .populate({
      path: "companyId",
      populate: { path: "plan", select: "permissions" }
    });

  if (!user) {
    throw new ApiError(401, "Invalid employee code for this dashboard");
  }

  // 3. Password Check
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Incorrect password");
  }


  if (!user.isVerified) {
    throw new ApiError(403, "Account not verified. Please verify your email.");
  }

  // Update login status
  user.lastLoginAt = new Date();
  user.isOnline = true;
  await user.save();

  // DASHBOARD STATS AGGREGATION (High Performance)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1; // 1-12
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[now.getMonth()];

  const [
    totalEmployees,
    activeToday,
    totalCalls,
    clientsAdded,
    targetData,
    achievementData,
    expenseData
  ] = await Promise.all([
    User.countDocuments({ companyId: company._id }),
    User.countDocuments({ companyId: company._id, isOnline: true }),
    DCR.countDocuments({ companyId: company._id }),
    Client.countDocuments({ companyId: company._id }),
    
    // Aggregations for totals
    MonthlyTarget.aggregate([
      { $match: { companyId: company._id, year: currentYear } },
      { $unwind: "$targets" },
      { $match: { "targets.month": currentMonthName } },
      { $group: { _id: null, total: { $sum: "$targets.target" } } }
    ]),
    
    MonthlyAchievement.aggregate([
      { $match: { companyId: company._id, year: currentYear } },
      { $unwind: "$achievements" },
      { $match: { "achievements.month": currentMonthName } },
      { $group: { _id: null, total: { $sum: "$achievements.achievement" } } }
    ]),
    
    Expense.aggregate([
      { $match: { companyId: company._id, year: currentYear, month: currentMonthNum } },
      { $group: { _id: null, total: { $sum: "$totalMonthAmount" } } }
    ])
  ]);

  const stats = {
    totalEmployees,
    activeToday,
    totalCalls,
    clientsAdded,
    monthlyTarget: targetData[0]?.total || 0,
    monthlyAchievement: achievementData[0]?.total || 0,
    monthlyExpense: expenseData[0]?.total || 0,
    achievementPercentage: targetData[0]?.total > 0 
      ? ((achievementData[0]?.total || 0) / targetData[0]?.total) * 100 
      : 0
  };

  const token = generateToken({
    _id: user._id,
    roleId: user.roleId?._id,
    permissions: user.roleId?.permissions || [],
    companyId: user.companyId,
    type: "COMPANY"
  });

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      companyId: user.companyId?._id,
      companyName: user.companyId?.name,
      planPermissions: user.companyId?.plan?.permissions || [],
      role: user.roleId?.name || "USER",
      roleLevel: user.roleId?.level,
      permissions: user.roleId?.permissions || [],
      area: user.area || "",
      subArea: user.subArea || [],
      dailyAllowance: user.dailyAllowance,
    },
    stats // Include real-time dashboard data
  });
});


export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new ApiError(400, "Incorrect old password");
  }

  // Block reuse
  if (user.passwordHistory) {
    for (let oldHash of user.passwordHistory) {
      const same = await bcrypt.compare(newPassword, oldHash);
      if (same) throw new ApiError(400, "You cannot reuse old password");
    }
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  user.password = hashed;

  if (!user.passwordHistory) {
    user.passwordHistory = [];
  }
  user.passwordHistory.push(hashed);

  if (user.passwordHistory.length > 5) {
    user.passwordHistory.shift(); // keep last 5
  }

  await user.save();

  res.json({ success: true, message: "Password updated successfully" });
});






export const sendLoginOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    throw new ApiError(400, "Email is required to send OTP");
  }

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found with this email");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = await bcrypt.hash(otp, 10);
  user.otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  try {
    await sendOtpEmail({
      to: email,
      name: user.name,
      otp,
    });
  } catch (err) {
    console.error("2FA Mail Error:", err);
    throw new ApiError(500, "Server failed to send verification email. Please try again later.");
  }

  res.json({ success: true, message: "Security code sent to your registered email" });
});
