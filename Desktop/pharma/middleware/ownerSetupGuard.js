
import ApiError from "../utils/ApiError.js";

export const ownerSetupGuard = (req, res, next) => {
  const secret = req.headers["x-owner-secret"];
  console.log(secret);

  if (!secret || secret !== process.env.OWNER_SETUP_SECRET) {
    throw new ApiError(401, "Unauthorized owner setup access");
  }

  next();
};
