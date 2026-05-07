import { Role, User, Company, Plan } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";


export const createRole = asyncHandler(async (req, res) => {
  const { name, permissions, level, salaryStructure } = req.body;

  if (!name) {
    throw new ApiError(400, "Role name is required");
  }

  const exists = await Role.findOne({
    companyId: req.user.companyId,
    name
  });

  if (exists) {
    throw new ApiError(409, "Role already exists");
  }

  // Validate Permissions against Company Plan
  const company = await Company.findById(req.user.companyId).populate("plan");
  if (!company || !company.plan) {
    throw new ApiError(400, "Company plan not found. Cannot assign permissions.");
  }

  const allowedPermissions = company.plan.permissions || [];
  const invalidPermissions = permissions.filter(p => !allowedPermissions.includes(p));

  if (invalidPermissions.length > 0) {
    throw new ApiError(403, `Unauthorized permissions for this plan: ${invalidPermissions.join(", ")}`);
  }

  const role = await Role.create({
    companyId: req.user.companyId,
    name,
    permissions,
    level: level || 10,
    salaryStructure: salaryStructure || []
  });

  res.status(201).json({
    message: "Role created successfully",
    role
  });
});


export const getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find({
    companyId: req.user.companyId,
    isActive: true
  });

  // Fetch Company Plan Permissions for frontend filtering
  const company = await Company.findById(req.user.companyId).populate("plan");
  const allowedPermissions = company?.plan?.permissions || [];

  res.status(200).json({
    roles,
    allowedPermissions
  });
});
// export const getUsersByRole = async (req, res) => {
//   const { roleId } = req.query;
//   console.log("roleId", roleId)
//   const companyId = req.user.companyId;
//   console.log("companyId", companyId)

//   const users = await User.find({ companyId, isActive: true })
//     .select("_id name email");
//   console.log("users:::::::::::::::::::", users)

//   res.json(users);
// };
export const getUsersByRole = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const currentUserRoleId = req.user.roleId; // ✅ logged-in user role

    // ✅ 1. Get all roles except current user role
    const roles = await Role.find({
      companyId,
      isActive: true,

    }).sort({ level: 1 });

    // ✅ 2. Get all users of company (except current role users)
    const users = await User.find({
      companyId,
      isActive: true,
      // roleId: { $ne: currentUserRoleId },
    }).select("_id name email roleId employeeId");

    // ✅ 3. Group users by role
    const result = roles.map((role) => {
      const roleUsers = users.filter(
        (u) => String(u.roleId) === String(role._id)
      );

      return {
        roleId: role._id,
        roleName: role.name,
        parentId: role.parentId,
        users: roleUsers,
      };
    });

    res.json(result);

  } catch (error) {
    console.error("getUsersByRole error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const updateRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { name, permissions, isActive, level, salaryStructure } = req.body;

  const role = await Role.findOne({
    _id: roleId,
    companyId: req.user.companyId
  });

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  if (name) role.name = name;
  if (permissions) {
    // Validate Permissions against Company Plan
    const company = await Company.findById(req.user.companyId).populate("plan");
    if (!company || !company.plan) {
      throw new ApiError(400, "Company plan not found. Cannot assign permissions.");
    }

    const allowedPermissions = company.plan.permissions || [];
    const invalidPermissions = permissions.filter(p => !allowedPermissions.includes(p));

    if (invalidPermissions.length > 0) {
      throw new ApiError(403, `Unauthorized permissions for this plan: ${invalidPermissions.join(", ")}`);
    }
    role.permissions = permissions;
  }
  if (typeof isActive === "boolean") role.isActive = isActive;
  if (level !== undefined) role.level = level;
  if (salaryStructure) role.salaryStructure = salaryStructure;

  await role.save();

  res.status(200).json({
    message: "Role updated successfully",
    role
  });
});


export const deleteRole = asyncHandler(async (req, res) => {
  const { roleId } = req.params;

  const role = await Role.findOne({
    _id: roleId,
    companyId: req.user.companyId
  });

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  // 🔒 Block deletion if any active user is assigned this role
  const assignedCount = await User.countDocuments({
    roleId,
    companyId: req.user.companyId,
    isActive: true
  });

  if (assignedCount > 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot delete role. ${assignedCount} active user(s) are assigned this role. Reassign them first.`
    });
  }

  role.isActive = false;
  await role.save();

  res.status(200).json({
    message: "Role deleted successfully"
  });
});

