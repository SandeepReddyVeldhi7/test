import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { PlatformAdmin } from "../models/index.js";

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

export const createPlatformOwner = asyncHandler(async (req, res) => {
  const { name, email, password, secret } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }
  if (secret !== process.env.PLATFORM_SECRET) {
    throw new ApiError(401, "Invalid secret");
  }
  const exists = await PlatformAdmin.findOne({ email });
  if (exists) {
    throw new ApiError(409, "Owner already exists");
  }

  // const hashedPassword = await hashPassword(password);
  const hashedPassword = await bcrypt.hash(password, 10);

  const owner = await PlatformAdmin.create({
    name,
    email,
    password: hashedPassword,
    role: "OWNER"
  });
  const token = generateToken({
    id: owner._id,
    role: owner.role,
    type: "PLATFORM"
  });
  res.status(201).json({
    message: "Platform Owner created successfully",
    token,
    owner: {
      id: owner._id,
      name: owner.name,
      email: owner.email,
      role: owner.role
    }
  });
});
