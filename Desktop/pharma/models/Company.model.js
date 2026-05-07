import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true }, // 4 letters + 4 digits
    logoUrl: String,
    
    // Organisational Details
    industry: String,
    contactEmail: String,
    phoneNumber: String,
    orgType: String,
    address: String,
    gstId: String,
    
    // SaaS Tenant Requirements
    webUrl: { type: String, unique: true, sparse: true },
    accessKey: { type: String, unique: true, sparse: true },

    // ─── Plan Reference (kept for backward compat with existing populate calls) ─
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true
    },

    // ─── Subscription State (current active subscription details) ────────────
    subscription: {
      billingCycle: {
        type: String,
        enum: ["Monthly", "Yearly", "Custom"],
        default: "Monthly"
      },
      startDate: Date,
      expiryDate: Date,
      months: { type: Number, default: 1 },
      userCount: { type: Number, default: 10 },
      status: {
        type: String,
        enum: ["ACTIVE", "TRIAL", "EXPIRED", "CANCELLED", "SUSPENDED"],
        default: "ACTIVE"
      },
      lastInvoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bill"
      },
      autoRenew: { type: Boolean, default: false },
      lastReminderSent: {
        type: String,
        enum: ["NONE", "30_DAYS", "15_DAYS", "3_DAYS", "EXPIRED"],
        default: "NONE"
      }
    },

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "EXPIRED"],
      default: "ACTIVE"
    },

    maxUsers: { type: Number, default: 50 },
    currentUsers: { type: Number, default: 0 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformAdmin"
    },

    salaryStructure: [
      {
        label: { type: String, required: true },
        isDefault: { type: Boolean, default: true }
      }
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
