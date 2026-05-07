import mongoose from "mongoose";

const dashboardUserSchema = new mongoose.Schema(
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
      ref: "DashboardRole",
      required: true,
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
    fcmTokens: [String],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DashboardUser",
    },
  },
  { timestamps: true },
);

dashboardUserSchema.index({ companyId: 1, employeeId: 1 }, { unique: true });
dashboardUserSchema.index({ companyId: 1, email: 1 }, { unique: true });

export default mongoose.model("DashboardUser", dashboardUserSchema);
