import { DashboardUser, DashboardRole, Company } from "../../models/index.js";
import ApiError from "../../utils/ApiError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import bcrypt from "bcryptjs";
import { sendEmail } from "../../services/email.service.js";

export const createDashboardUser = asyncHandler(async (req, res) => {
  const {
    name, email, mobile, employeeId, roleId, password, designation
  } = req.body;
  const companyId = req.user.companyId;

  const exists = await DashboardUser.findOne({ companyId, email: email.toLowerCase() });
  if (exists) throw new ApiError(400, "User with this email already exists");

  const idExists = await DashboardUser.findOne({ companyId, employeeId });
  if (idExists) throw new ApiError(400, "User with this Employee ID already exists");

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await DashboardUser.create({
    companyId,
    name,
    email: email.toLowerCase(),
    mobile,
    employeeId,
    designation,
    roleId,
    password: hashedPassword,
    createdBy: req.user._id,
    isActive: true,
    isVerified: true
  });

  // Send Welcome Email
  try {
    const company = await Company.findById(companyId);
    const welcomeHtml = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Welcome to the Dashboard, ${name}!</h2>
        <p>Your dashboard account has been created for ${company?.name}.</p>
        <p><strong>Employee ID:</strong> ${employeeId}</p>
        <p><strong>Temporary Password:</strong> ${password}</p>
        <p>Please log in and change your password immediately.</p>
      </div>
    `;
    await sendEmail(email, "Welcome to Dashboard", welcomeHtml, company?.name);
  } catch (err) {
    console.error("Welcome Email Error:", err);
  }

  res.status(201).json({
    success: true,
    message: "Dashboard user created successfully",
    user
  });
});

export const getAllDashboardUsers = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { search, roleId, isActive } = req.query;

  const filter = { companyId };
  if (roleId) filter.roleId = roleId;
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { employeeId: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
  }

  const users = await DashboardUser.find(filter)
    .sort({ createdAt: -1 })
    .select("-password -passwordHistory -otp -otpExpiresAt")
    .populate("roleId", "name permissions");

  res.json({
    success: true,
    users
  });
});

export const getDashboardUserById = asyncHandler(async (req, res) => {
  const user = await DashboardUser.findOne({
    _id: req.params.id,
    companyId: req.user.companyId
  })
    .select("-password -passwordHistory -otp -otpExpiresAt")
    .populate("roleId", "name permissions");

  if (!user) throw new ApiError(404, "User not found");

  res.json({
    success: true,
    user
  });
});

export const updateDashboardUser = asyncHandler(async (req, res) => {
  const { name, email, mobile, roleId, isActive, designation } = req.body;
  const user = await DashboardUser.findOne({
    _id: req.params.id,
    companyId: req.user.companyId
  });

  if (!user) throw new ApiError(404, "User not found");

  if (name) user.name = name;
  if (email) user.email = email.toLowerCase();
  if (mobile !== undefined) user.mobile = mobile;
  if (roleId) user.roleId = roleId;
  if (designation) user.designation = designation;
  if (typeof isActive === "boolean") user.isActive = isActive;

  await user.save();

  res.json({
    success: true,
    message: "Dashboard user updated successfully",
    user
  });
});

export const deleteDashboardUser = asyncHandler(async (req, res) => {
  const user = await DashboardUser.findOne({
    _id: req.params.id,
    companyId: req.user.companyId
  });

  if (!user) throw new ApiError(404, "User not found");

  user.isActive = false;
  await user.save();

  res.json({
    success: true,
    message: "Dashboard user deactivated successfully"
  });
});
