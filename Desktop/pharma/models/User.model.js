import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    employeeId: { type: String, required: true },
    designation: { type: String },
    joiningDate: { type: Date },
    photo: { type: String },
    mobile: String,

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    managerType: {
      type: String,
      enum: ["own", "others"],
      default: "own",
    },
    password: { type: String, required: true },
    passwordHistory: [String],

    otp: String,
    otpExpiresAt: Date,
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
    lastLoginAt: Date,
    lastActiveAt: Date,
    isOnline: { type: Boolean, default: false },
    lastLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      updatedAt: { type: Date }
    },
    lastMovementAt: { type: Date },
    fcmTokens: [String],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    dailyAllowance: {
      type: Number,
      default: 250,
    },
    stations: [String],
    subAreas: [String],
  },
  { timestamps: true },
);

userSchema.index({ companyId: 1, employeeId: 1 }, { unique: true });
userSchema.index({ managerId: 1 });
userSchema.index({ companyId: 1, isActive: 1, isOnline: 1 });
userSchema.index({ fcmTokens: 1 });
export default mongoose.model("User", userSchema);
