import mongoose from "mongoose";

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  itemType: {
    type: String,
    enum: ["SUBSCRIPTION", "SETUP", "MIGRATION", "ADDON", "CREDIT", "OTHER"],
    default: "SUBSCRIPTION"
  }
}, { _id: false });

const billSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true
    },
    billingEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillingEntity",
      required: true
    },

    // ─── Sequential Invoice Number (via Counter model) ──────────
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceDate: { type: Date, default: Date.now },

    // ─── Bill Type & Lifecycle ──────────────────────────────────
    type: {
      type: String,
      enum: ["INITIAL", "RENEWAL", "UPGRADE", "DOWNGRADE", "FREE_TRIAL", "CREDIT_NOTE"],
      default: "INITIAL"
    },

    // Links to previous bill for upgrade/renewal chain
    previousBillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      default: null
    },

    // ─── Subscription Period ────────────────────────────────────
    subscriptionPeriod: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
      months: { type: Number, default: 1 }
    },

    // ─── Plan Snapshot (frozen at time of billing) ──────────────
    planSnapshot: {
      planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
      planName: { type: String, required: true },
      pricePerUser: { type: Number, required: true },
      billingCycle: { type: String, default: "Monthly" }  // Monthly / Yearly / Custom
    },

    userCount: { type: Number, required: true },

    // ─── Itemized Charges ───────────────────────────────────────
    lineItems: [lineItemSchema],

    // ─── Financials ─────────────────────────────────────────────
    subtotal: { type: Number, required: true },           // Sum of all lineItems
    additionalCharges: { type: Number, default: 0 },

    // Discount
    discount: {
      type: { type: String, enum: ["PERCENTAGE", "FIXED"], default: "PERCENTAGE" },
      value: { type: Number, default: 0 },     // e.g. 10 (for 10%)
      amount: { type: Number, default: 0 }     // Calculated discount ₹
    },

    // Tax (user-entered rate, we calculate amount)
    taxBreakdown: {
      taxType: { type: String, default: "GST" },
      rate: { type: Number, default: 18 },     // User enters this
      amount: { type: Number, default: 0 }     // Calculated: taxableAmount × rate%
    },

    taxableAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    // ─── Payment & Status ───────────────────────────────────────
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "OVERDUE", "REFUNDED", "WAIVED"],
      default: "PENDING"
    },
    paidAt: Date,

    status: {
      type: String,
      enum: ["DRAFT", "FINALIZED", "CANCELLED"],
      default: "DRAFT"
    },

    // ─── Metadata ───────────────────────────────────────────────
    gstId: String,
    notes: String,   // Admin notes ("Free trial extended", "Migration credit")

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformAdmin"
    }
  },
  { timestamps: true }
);

// Index for fast company billing history queries
billSchema.index({ companyId: 1, invoiceDate: -1 });
billSchema.index({ paymentStatus: 1 });

export default mongoose.model("Bill", billSchema);
