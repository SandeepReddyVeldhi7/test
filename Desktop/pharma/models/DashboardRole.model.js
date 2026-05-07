import mongoose from "mongoose";

const dashboardRoleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },

    name: {
      type: String,
      required: true
    },

    permissions: [String],

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

dashboardRoleSchema.index({ companyId: 1, name: 1 }, { unique: true });

export default mongoose.model("DashboardRole", dashboardRoleSchema);
