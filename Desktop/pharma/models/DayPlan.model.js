import mongoose from "mongoose";

const dayPlanSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    workType: {
      type: String,
      required: true
    },

    territoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Territory"
    },

    jointWork: {
      isJoint: { type: Boolean, default: false },
      withUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    },

    remarks: String,
    date: { type: Date, required: true },

    location: {
      lat: Number,
      lng: Number
    },
    deviation: {
      type: Boolean,
      default: false
    },
    deviationReason: String
  },
  { timestamps: true }
);
dayPlanSchema.index(
  { companyId: 1, userId: 1, date: 1 },
  { unique: true }
);

export default mongoose.model("DayPlan", dayPlanSchema);
