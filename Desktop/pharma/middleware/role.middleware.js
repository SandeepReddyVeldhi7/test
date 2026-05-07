
import ApiError from "../utils/ApiError.js";

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = (req.userRole || "").toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

    if (!userRole || !normalizedAllowedRoles.includes(userRole)) {
      throw new ApiError(403, "Access denied");
    }
    next();
  };
};
