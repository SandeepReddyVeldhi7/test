import jwt from "jsonwebtoken";
import { PlatformAdmin, User, DashboardUser } from "../models/index.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded._id || decoded.id;
    if (!userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Try finding in all possible user collections
    const [user, owner, dashboardUser] = await Promise.all([
      User.findById(userId).populate("roleId"),
      PlatformAdmin.findById(userId).populate("role"),
      DashboardUser.findById(userId).populate("roleId")
    ]);

    if (!user && !owner && !dashboardUser) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = owner || dashboardUser || user;
    
    // Normalize role so role-based middlewares (isAdmin, authorizeRoles) can work
    // We attach it to req.userRole to avoid conflicts with Mongoose model fields (like PlatformAdmin.role)
    if (user && user.roleId) {
      req.userRole = user.roleId.name?.toUpperCase();
    } else if (dashboardUser && dashboardUser.roleId) {
      req.userRole = dashboardUser.roleId.name?.toUpperCase();
    } else if (owner && owner.role) {
      req.userRole = owner.role.name?.toUpperCase() || "OWNER";
    } else if (owner) {
      req.userRole = "OWNER";
    }

    next();

  } catch (error) {
    console.log("Error verifying token:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" }); // ✅ IMPORTANT
    }

    return res.status(401).json({ message: "Invalid token" });
  }
};

export const isAdmin = (req, res, next) => {
  const role = (req.userRole || "").toUpperCase();
  const adminRoles = ["SUPER_ADMIN", "ADMIN", "HR", "OWNER", "PLATFORM_OWNER"];

  if (req.user && adminRoles.includes(role)) {
    next();
  } else {
    res.status(403).json({ message: `Access denied. Admin rights required. (Current role: ${role})` });
  }
};

export const verifyPlatformAdmin = (req, res, next) => {
  // In our protect middleware, if it's a platform admin, req.user will be the owner object
  // User objects have roleId, while PlatformAdmins might have a different structure or we can check the model name
  // Since we assign req.user = owner || user, we can check if the object came from PlatformAdmin
  
  if (req.user && req.user.constructor.modelName === 'PlatformAdmin') {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Platform Admin rights required." });
  }
};
