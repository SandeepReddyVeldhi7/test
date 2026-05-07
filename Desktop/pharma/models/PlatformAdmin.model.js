import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const platformAdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "PlatformRole",
      required: true 
    },
    isActive: { type: Boolean, default: true },
    
    // 2FA / OTP Fields
    otp: { type: String },
    otpExpiresAt: { type: Date },
    isOtpVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

platformAdminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

export default mongoose.model("PlatformAdmin", platformAdminSchema);
