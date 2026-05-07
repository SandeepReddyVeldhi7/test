import mongoose from "mongoose";

const monthlyAchievementSchema = new mongoose.Schema(
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
    achievements: [
      {
        month: {
          type: String,
          required: true,
        },
        achievement: {
          type: Number,
          default: 0,
        },
        secondary: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  { timestamps: true }
);

// Unique constraint to ensure one achievement document per user per year
monthlyAchievementSchema.index({ userId: 1, year: 1 }, { unique: true });

monthlyAchievementSchema.index({ companyId: 1, year: 1 });

export default mongoose.model("MonthlyAchievement", monthlyAchievementSchema);
