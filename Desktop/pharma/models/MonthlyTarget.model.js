import mongoose from "mongoose";

const monthlyTargetSchema = new mongoose.Schema(
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
    year: {
      type: Number,
      required: true,
    },
    targets: [
      {
        month: {
          type: String,
          required: true,
        },
        target: {
          type: Number,
          default: 0,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Unique constraint to ensure one target document per user per year
monthlyTargetSchema.index({ userId: 1, year: 1 }, { unique: true });

export default mongoose.model("MonthlyTarget", monthlyTargetSchema);
