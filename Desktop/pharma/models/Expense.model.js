import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
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
    month: {
      type: Number, // 1-12
      required: true
    },
    year: {
      type: Number,
      required: true
    },
    days: [
      {
        date: { type: Date, required: true },
        territoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Territory"
        },
        area: String, // Helper for display (mapped from territory or custom)
        workType: { type: String, default: "FIELD" },
        expenses: [
          {
            area: { type: String, required: true },
            amount: { type: Number, required: true },
            remarks: String,
            bills: { type: [String], default: [] }
          }
        ],
        totalAmount: { type: Number, required: true },
        status: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED", "RESUBMITTED"],
          default: "PENDING"
        },
        rejectionReason: String
      }
    ],
    totalMonthAmount: { type: Number, default: 0 },
    approval: {
      status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING"
      },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvedAt: Date,
      rejectionReason: String
    }
  },
  { timestamps: true }
);

expenseSchema.index(
  { companyId: 1, userId: 1, month: 1, year: 1 },
  { unique: true }
);

// Enterprise index for fast cross-user date range auditing
expenseSchema.index({ companyId: 1, "days.date": 1 });
expenseSchema.index({ companyId: 1, totalMonthAmount: -1 });

export default mongoose.model("Expense", expenseSchema);
