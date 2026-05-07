import mongoose from "mongoose";

const toDoSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    time: {
      type: String, // HH:mm
      required: true,
    },
    type: {
      type: String,
      enum: ["Meeting", "Task", "Event", "Other"],
      default: "Task",
    },
  },
  { timestamps: true }
);

// Index for efficient querying by user and date
toDoSchema.index({ userId: 1, date: 1 });

export default mongoose.model("ToDo", toDoSchema);
