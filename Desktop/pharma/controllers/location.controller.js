import asyncHandler from "../utils/asyncHandler.js";
import { User, UserLocation } from "../models/index.js";
import { io } from "../index.js";
import { calculateDistance } from "../utils/geoUtils.js";

/**
 * @desc  User sends their current location (called from mobile app every 1 min)
 * @route POST /api/location/update
 * @access Private
 */
export const updateLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, accuracy } = req.body;
  const userId = req.user._id;
  const companyId = req.user.companyId;

  if (latitude == null || longitude == null) {
    return res.status(400).json({ message: "latitude and longitude required" });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const now = new Date();
  let lastMovementAt = user.lastMovementAt || user.lastLocation?.updatedAt || now;

  // 1. 📏 Movement Detection Logic
  if (user.lastLocation?.latitude) {
    const distance = calculateDistance(
      user.lastLocation.latitude,
      user.lastLocation.longitude,
      latitude,
      longitude
    );
    
    // If moved > 10m, reset the movement clock
    if (distance > 10) {
      lastMovementAt = now;
    }
  } else {
    // Initial location setup
    lastMovementAt = now;
  }

  // 2. Save to location history
  await UserLocation.create({ companyId, userId, latitude, longitude, accuracy });

  // 3. Update user's state
  user.lastLocation = { latitude, longitude, updatedAt: now };
  user.lastActiveAt = now;
  user.isOnline = true;
  user.lastMovementAt = lastMovementAt;
  await user.save();

  // 4. Broadcast to admin room via socket
  io.to(`company:${companyId}:admins`).emit("locationUpdate", {
    userId,
    latitude,
    longitude,
    isIdle: (now.getTime() - lastMovementAt.getTime()) > (5 * 60 * 1000), // Idle if > 5 mins
    timestamp: now
  });

  res.status(200).json({ success: true });
});

/**
 * @desc  Get latest locations for all users (admin map view)
 * @route GET /api/location/all
 * @access Private (Super Admin / HR)
 */
export const getAllUsersLocations = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;

  const users = await User.find({ companyId, isActive: true, isVerified: true })
    .select("_id name employeeId roleId isOnline lastLocation lastActiveAt")
    .populate("roleId", "name level");

  const result = users.map(u => ({
    userId: u._id,
    name: u.name,
    employeeId: u.employeeId,
    role: u.roleId?.name || "—",
    roleLevel: u.roleId?.level,
    isOnline: u.isOnline,
    lastActiveAt: u.lastActiveAt,
    location: u.lastLocation || null
  }));

  res.status(200).json({ success: true, data: result });
});

/**
 * @desc  Get location history for a specific user
 * @route GET /api/location/history/:userId?from=&to=
 * @access Private (Super Admin / HR)
 */
export const getUserLocationHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { from, to } = req.query;

  const filter = { userId };
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  const history = await UserLocation.find(filter)
    .sort({ timestamp: -1 })
    .limit(500);

  res.status(200).json({ success: true, data: history });
});
