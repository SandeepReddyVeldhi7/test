
import { Plan } from "../../models/index.js";
import ApiError from "../../utils/ApiError.js";
import asyncHandler from "../../utils/asyncHandler.js";

/**
 * OWNER only
 */
export const createPlan = asyncHandler(async (req, res) => {
  const { name, price, features, permissions } = req.body;

  if (!name || price === undefined) {
    throw new ApiError(400, "All required fields must be provided");
  }

  const exists = await Plan.findOne({ name });
  if (exists) {
    throw new ApiError(409, "Plan already exists");
  }

  const plan = await Plan.create({
    name,
    price,
    features,
    permissions
  });

  res.status(201).json({
    message: "Plan created successfully",
    plan
  });
});

/**
 * OWNER + Company Super Admin
 */
export const getPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find({ isActive: true }).sort({ price: 1 });

  res.status(200).json(plans);
});

/**
 * OWNER only
 */
export const updatePlan = asyncHandler(async (req, res) => {
  const { id } = req.query; // Assuming ID is passed in query, or we can use params
  const { name, price, features, permissions, isActive } = req.body;

  const plan = await Plan.findById(id);
  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  if (name) plan.name = name;
  if (price !== undefined) plan.price = price;
  if (features) plan.features = features;
  if (permissions) plan.permissions = permissions;
  if (isActive !== undefined) plan.isActive = isActive;

  await plan.save();

  res.status(200).json({
    message: "Plan updated successfully",
    plan,
  });
});

/**
 * OWNER only
 */
export const deletePlan = asyncHandler(async (req, res) => {
  const { id } = req.query;

  const plan = await Plan.findById(id);
  if (!plan) {
    throw new ApiError(404, "Plan not found");
  }

  // Soft delete
  plan.isActive = false;
  await plan.save();

  res.status(200).json({
    message: "Plan deleted successfully",
  });
});
