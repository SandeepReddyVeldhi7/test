import mongoose from "mongoose";

const leavePolicySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true
    },
    // Annual Quotas
    sickQuota: {
      type: Number,
      default: 12
    },
    casualQuota: {
      type: Number,
      default: 12
    },
    earnedQuota: {
      type: Number,
      default: 24
    },
    // Carry Forward Rules (False = Expires, True = Adds to next year)
    sickCarry: {
      type: Boolean,
      default: false
    },
    casualCarry: {
      type: Boolean,
      default: false
    },
    earnedCarry: {
      type: Boolean,
      default: false
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

export default mongoose.model("LeavePolicy", leavePolicySchema);
