import mongoose from "mongoose";

const clientAuditSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    oldPriority: {
      type: String,
      enum: ["L", "UL"],
      required: true
    },
    newPriority: {
      type: String,
      enum: ["L", "UL"],
      required: true
    },
    oldStatus: {
      type: String,
      enum: ["active", "inactive"]
    },
    newStatus: {
      type: String,
      enum: ["active", "inactive"]
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

export default mongoose.model("ClientAudit", clientAuditSchema);
