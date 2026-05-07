// models/Role.js
import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },

    name: {
      type: String,
      required: true // "ASM", "Doctor", "Branch Manager"
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null
    },

    permissions: [String],

    level: {
      type: Number,
      default: 10
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

roleSchema.index({ companyId: 1, name: 1 }, { unique: true });

export default mongoose.model("Role", roleSchema);
