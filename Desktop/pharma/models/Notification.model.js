import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: ["IN_APP", "WEB_PUSH", "BOTH", "PUSH"],
      default: "IN_APP"
    },
    category: {
      type: String,
      enum: [
        "IDLE_ALERT",
        "PLAN_SUBMITTED",
        "DAY_PLAN",
        "TOUR_PLAN",
        "EXPENSE",
        "EXPENSE_SUBMITTED",
        "ACTIVITY",
        "LEAVE",
        "CLIENT_ADDED",
        "CLIENT_SPECIAL_DATE",
        "TODO_REMINDER",
        "SYSTEM",
        "GENERAL"
      ],
      default: "GENERAL"
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    relatedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    // Screen name in RootNavigator to navigate to on tap
    redirectTo: { type: String },
    // Optional params to pass to that screen
    redirectParams: { type: mongoose.Schema.Types.Mixed },
    metadata: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
