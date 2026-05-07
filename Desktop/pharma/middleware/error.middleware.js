import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  console.error("ERROR:", err);

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(err.errors)
        .map(e => e.message)
        .join(", ")
    });
  }

  // Custom ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  // Default
  return res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
};;

export default errorHandler;
