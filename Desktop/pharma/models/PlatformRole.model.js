import mongoose from "mongoose";

const platformRoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    permissions: [{ type: String }], // List of permission keys (e.g., 'Dashboard', 'Organizations')
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("PlatformRole", platformRoleSchema);
