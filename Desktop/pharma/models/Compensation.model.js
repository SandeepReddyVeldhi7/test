import mongoose from "mongoose";

const revisionSchema = new mongoose.Schema({
  effectiveFrom: {
    type: String, // e.g. "2024-04"
    required: true,
  },
  label: {
    type: String, // e.g. "FY 2024-25 Initial"
    required: true,
  },
  designation: {
    type: String,
    required: true,
  },
  components: [
    {
      label: { type: String, required: true },
      value: { type: Number, required: true },
    }
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  isLocked: {
    type: Boolean,
    default: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const compensationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One master doc per user
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    // The active/current salary breakdown for quick lookups
    current: revisionSchema,
    // Timeline of all previous salary structures
    history: [revisionSchema],
  },
  { timestamps: true }
);

// Enterprise-grade indices for fast organizational auditing
compensationSchema.index({ companyId: 1, "current.totalAmount": -1 });
compensationSchema.index({ userId: 1, companyId: 1 });

export default mongoose.model("Compensation", compensationSchema);
