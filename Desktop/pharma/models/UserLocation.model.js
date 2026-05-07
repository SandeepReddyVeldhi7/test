import mongoose from "mongoose";

const userLocationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

// Index for efficient querying of recent locations per user
userLocationSchema.index({ userId: 1, timestamp: -1 });
userLocationSchema.index({ companyId: 1, timestamp: -1 });

export default mongoose.model("UserLocation", userLocationSchema);
