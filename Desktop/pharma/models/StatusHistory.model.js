import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    status: {
      type: Boolean,
      required: true, // true for active, false for inactive
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: String,
  },
  { timestamps: true }
);

statusHistorySchema.index({ userId: 1, createdAt: -1 });
statusHistorySchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.model("StatusHistory", statusHistorySchema);
