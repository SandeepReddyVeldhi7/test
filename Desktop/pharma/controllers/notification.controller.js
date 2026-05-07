import asyncHandler from "../utils/asyncHandler.js";
import { Notification, WebPushSubscription, User } from "../models/index.js";
import webpush from "web-push";
import admin from "firebase-admin";
import { Expo } from "expo-server-sdk";

// Initialize Expo SDK
const expo = new Expo();

// Initialize Firebase Admin (safe fallback if config is missing)
try {
  if (!admin.apps.length) {
    let jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (jsonStr) {
      // Robustly handle surrounding quotes if present
      jsonStr = jsonStr.trim();
      if ((jsonStr.startsWith("'") && jsonStr.endsWith("'")) || (jsonStr.startsWith('"') && jsonStr.endsWith('"'))) {
        jsonStr = jsonStr.slice(1, -1);
      }
      
      let serviceAccount = JSON.parse(jsonStr);
      
      // Fix for common newline issue in environment variables
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("✅ Firebase Admin initialized successfully");
    } else {
      console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_JSON missing — push notifications will not be sent via FCM");
    }
  }
} catch (err) {
  console.error("❌ Firebase initialization failed:", err.message);
  console.log("Environment check: FIREBASE_SERVICE_ACCOUNT_JSON length =", process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.length || 0);
}

// VAPID keys should be in environment variables
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:" + (process.env.SMTP_USER || "admin@pharma.com"),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * @desc  Save browser push subscription for this user
 * @route POST /api/notifications/subscribe
 */
export const subscribePush = asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ message: "Subscription required" });

  await WebPushSubscription.findOneAndUpdate(
    { userId: req.user._id },
    { userId: req.user._id, companyId: req.user.companyId, subscription },
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true });
});

/**
 * @desc  Get notifications for logged-in user
 * @route GET /api/notifications
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { limit = 50, page = 1 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [notifications, total] = await Promise.all([
    Notification.find({ recipientId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("relatedUserId", "name employeeId"),
    Notification.countDocuments({ recipientId: req.user._id })
  ]);

  const unread = await Notification.countDocuments({
    recipientId: req.user._id,
    isRead: false
  });

  res.json({ success: true, data: { notifications, total, unread } });
});

/**
 * @desc  Mark notification(s) as read
 * @route PUT /api/notifications/read
 */
export const markRead = asyncHandler(async (req, res) => {
  const { ids } = req.body; // array of notification ids, or "all"

  if (ids === "all") {
    await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { isRead: true }
    );
  } else if (Array.isArray(ids)) {
    await Notification.updateMany(
      { _id: { $in: ids }, recipientId: req.user._id },
      { isRead: true }
    );
  }

  res.json({ success: true });
});

/**
 * @desc  Clear all notifications for logged-in user
 * @route DELETE /api/notifications/all
 */
export const clearAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ recipientId: req.user._id });
  res.json({ success: true, message: "All notifications cleared" });
});

/**
 * @desc  Delete a single notification
 * @route DELETE /api/notifications/:id
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({
    _id: req.params.id,
    recipientId: req.user._id
  });
  res.json({ success: true, message: "Notification deleted" });
});

/**
 * Internal helper: send web push to all super admins of a company
 */
export const sendWebPushToAdmins = async (companyId, payload) => {
  try {
    if (!process.env.VAPID_PUBLIC_KEY) return;

    const subscriptions = await WebPushSubscription.find({ companyId });
    const payloadStr = JSON.stringify(payload);

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription, payloadStr);
      } catch (err) {
        if (err.statusCode === 410) {
          // Subscription expired — remove it
          await WebPushSubscription.deleteOne({ _id: sub._id });
        }
      }
    }
  } catch (err) {
    console.error("sendWebPushToAdmins error:", err.message);
  }
};

/**
 * Internal helper: send push notification using FCM or Expo
 */
export const sendPushNotification = async (recipientId, { title, body, metadata = {}, redirectTo, redirectParams }) => {
  console.log(`[Push Notification] Attempting to send to User: ${recipientId}`);
  try {
    const user = await User.findById(recipientId).select("fcmTokens");
    if (!user) {
      console.log(`[Push] User ${recipientId} not found in DB`);
      return;
    }
    
    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      console.log(`[Push] User ${recipientId} has NO tokens stored`);
      return;
    }

    const expoTokens = [];
    const fcmTokens = [];

    // Separate Expo and Native FCM tokens
    user.fcmTokens.forEach(token => {
      if (Expo.isExpoPushToken(token)) {
        expoTokens.push(token);
      } else {
        fcmTokens.push(token);
      }
    });

    console.log(`[Push Notification] Recipient=${recipientId}, Tokens=${JSON.stringify(user.fcmTokens)}`);

    const dataPayload = {
      title: title || "",
      body: body || "",
      redirectTo: redirectTo || "",
      ...Object.fromEntries(
        Object.entries(metadata).map(([k, v]) => [k, String(v)])
      )
    };
    if (redirectParams) {
      dataPayload.redirectParams = JSON.stringify(redirectParams);
    }

    // 1. Dispatch via Expo Service
    if (expoTokens.length > 0) {
      const messages = expoTokens.map(token => ({
        to: token,
        sound: "default",
        title,
        body,
        data: dataPayload,
      }));

      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          console.log(`Sending chunk of ${chunk.length} to Expo...`);
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          console.log("Expo Tickets:", JSON.stringify(tickets));
        } catch (error) {
          console.error("Expo send error:", error);
        }
      }
    }

    // 2. Dispatch via Firebase Admin (Native FCM)
    if (fcmTokens.length > 0 && admin.apps.length > 0) {
      const message = {
        notification: { title, body },
        data: dataPayload,
        tokens: fcmTokens
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      // Clean up invalid FCM tokens
      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error?.code;
            if (
              error === "messaging/invalid-registration-token" ||
              error === "messaging/registration-token-not-registered"
            ) {
              failedTokens.push(fcmTokens[idx]);
            }
          }
        });

        if (failedTokens.length > 0) {
          await User.findByIdAndUpdate(recipientId, {
            $pull: { fcmTokens: { $in: failedTokens } }
          });
        }
      }
    }
  } catch (err) {
    console.error("sendPushNotification error:", err.message);
  }
};

/**
 * Internal helper: create in-app notification record + send FCM push
 */
export const createNotification = async ({
  companyId,
  recipientId,
  type = "IN_APP",
  category = "GENERAL",
  title,
  body,
  relatedUserId,
  redirectTo,
  redirectParams,
  metadata
}) => {
  try {
    const notif = await Notification.create({
      companyId,
      recipientId,
      type,
      category,
      title,
      body,
      relatedUserId,
      redirectTo,
      redirectParams,
      metadata
    });

    // Always send FCM push when we have a recipient
    await sendPushNotification(recipientId, { title, body, metadata, redirectTo, redirectParams });

    return notif;
  } catch (err) {
    console.error("createNotification error:", err.message);
  }
};
