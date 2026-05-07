import { DashboardRole, DashboardUser } from "../../models/index.js";
import ApiError from "../../utils/ApiError.js";
import asyncHandler from "../../utils/asyncHandler.js";

const VALID_PERMISSIONS = ["Dashboard", "Analytics", "Administration", "Finance", "Dashboard Users"];

export const createDashboardRole = asyncHandler(async (req, res) => {
  const { name, permissions } = req.body;

  if (!name) {
    throw new ApiError(400, "Role name is required");
  }

  const exists = await DashboardRole.findOne({
    companyId: req.user.companyId,
    name
  });

  if (exists) {
    throw new ApiError(409, "Dashboard role already exists");
  }

  const role = await DashboardRole.create({
    companyId: req.user.companyId,
    name,
    permissions: permissions || []
  });

  res.status(201).json({
    success: true,
    message: "Dashboard role created successfully",
    role
  });
});

export const getDashboardRoles = asyncHandler(async (req, res) => {
  const roles = await DashboardRole.find({
    companyId: req.user.companyId,
    isActive: true
  });

  res.status(200).json({
    success: true,
    roles,
    validPermissions: VALID_PERMISSIONS
  });
});

export const updateDashboardRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { name, permissions, isActive } = req.body;

  const role = await DashboardRole.findOne({
    _id: roleId,
    companyId: req.user.companyId
  });

  if (!role) {
    throw new ApiError(404, "Dashboard role not found");
  }

  if (name) role.name = name;
  if (permissions) role.permissions = permissions;
  if (typeof isActive === "boolean") role.isActive = isActive;

  await role.save();

  res.status(200).json({
    success: true,
    message: "Dashboard role updated successfully",
    role
  });
});

export const deleteDashboardRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;

  const role = await DashboardRole.findOne({
    _id: roleId,
    companyId: req.user.companyId
  });

  if (!role) {
    throw new ApiError(404, "Dashboard role not found");
  }

  const assignedCount = await DashboardUser.countDocuments({
    roleId,
    companyId: req.user.companyId,
    isActive: true
  });

  if (assignedCount > 0) {
    throw new ApiError(400, `Cannot delete role. ${assignedCount} users are assigned this role.`);
  }

  role.isActive = false;
  await role.save();

  res.status(200).json({
    success: true,
    message: "Dashboard role deleted successfully"
  });
});
