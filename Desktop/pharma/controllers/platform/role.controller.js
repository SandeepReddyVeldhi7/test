import PlatformRole from "../../models/PlatformRole.model.js";
import PlatformAdmin from "../../models/PlatformAdmin.model.js";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";

// @desc    Create a new platform role
// @route   POST /api/platform/roles
export const createRole = asyncHandler(async (req, res) => {
  const { name, permissions } = req.body;

  const roleExists = await PlatformRole.findOne({ name });
  if (roleExists) {
    throw new ApiError(400, "Role already exists");
  }

  const role = await PlatformRole.create({
    name,
    permissions
  });

  res.status(201).json({
    success: true,
    data: role
  });
});

// @desc    Get all platform roles
// @route   GET /api/platform/roles
export const getRoles = asyncHandler(async (req, res) => {
  const roles = await PlatformRole.find({ isActive: true });

  res.status(200).json({
    success: true,
    data: roles
  });
});

// @desc    Update a platform role
// @route   PUT /api/platform/roles/:id
export const updateRole = asyncHandler(async (req, res) => {
  const role = await PlatformRole.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  res.status(200).json({
    success: true,
    data: role
  });
});

// @desc    Delete a platform role
// @route   DELETE /api/platform/roles/:id
export const deleteRole = asyncHandler(async (req, res) => {
  const roleId = req.params.id;

  // Check if role is assigned to any PlatformAdmin
  const assignedAdmin = await PlatformAdmin.findOne({ role: roleId });
  if (assignedAdmin) {
    throw new ApiError(400, "Cannot delete role as it is currently assigned to one or more admins.");
  }

  const role = await PlatformRole.findByIdAndDelete(roleId);

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  res.status(200).json({
    success: true,
    message: "Role deleted successfully"
  });
});
