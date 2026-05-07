import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true // TRIAL, BASIC, PRO, CUSTOM
    },

    price: {
      type: Number,
      default: 0 // Price per user per month
    },

    features: [String],

    permissions: [String],

    isCustom: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Plan", planSchema);
