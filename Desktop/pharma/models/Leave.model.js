import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
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

    type: {
      type: String, // "SICK", "CASUAL", "EARNED"
      required: true
    },

    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },
    
    totalDays: {
      type: Number,
      required: true,
      default: 1
    },

    reason: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    approvedAt: Date,

    rejectionReason: String
  },
  { timestamps: true }
);

export default mongoose.model("Leave", leaveSchema);
