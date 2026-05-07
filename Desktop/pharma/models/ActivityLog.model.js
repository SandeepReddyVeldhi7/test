import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    action: {
      type: String,
      enum: ["LOGIN", "PUNCH_IN", "DCR", "EXPENSE"]
    },
    workType: { type: String },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client"
    },

    designation: { type: String },
    clientInterest: { type: String },
    area: { type: String },

    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String }
    },

    timestamp: { type: Date, default: Date.now },
    isDeviation: { type: Boolean, default: false },
    deviationReason: { type: String },

    approval: {
      status: { 
        type: String, 
        enum: ['PENDING', 'APPROVED', 'REJECTED'], 
        default: 'PENDING' 
      },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvedAt: { type: Date },
      managerComment: { type: String }
    },
    photo: { type: String },
    remarks: { type: String },
    category: {
      type: String,
      enum: ["Listed", "Unlisted"]
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"]
    }
  },
  { timestamps: true }
);

activityLogSchema.index(
  { userId: 1, clientId: 1, timestamp: 1 },
  { unique: false }
);
activityLogSchema.index({ companyId: 1, action: 1, timestamp: -1 });
activityLogSchema.index({ companyId: 1, timestamp: -1 });
export default mongoose.model("ActivityLog", activityLogSchema);