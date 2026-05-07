import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },

    date: {
      type: Date,
      required: true
    },

    name: {
      type: String,
      required: true
    },

    type: {
      type: String, // "NATIONAL", "REGIONAL", "OPTIONAL"
      default: "NATIONAL"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

// Ensure a company can't have duplicate holiday names on the same date
holidaySchema.index({ companyId: 1, date: 1, name: 1 }, { unique: true });

export default mongoose.model("Holiday", holidaySchema);
