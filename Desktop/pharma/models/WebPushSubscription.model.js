import mongoose from "mongoose";

const webPushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },
    subscription: {
      endpoint: { type: String, required: true },
      expirationTime: { type: Number },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
      }
    }
  },
  { timestamps: true }
);

webPushSubscriptionSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model("WebPushSubscription", webPushSubscriptionSchema);
