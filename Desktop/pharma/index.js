import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import connectDB from "./config/db.js";
import { Server } from "socket.io";
import http from 'node:http';
import cron from "node-cron";
import authRoutes from "./routes/auth.routes.js";
import planRoutes from "./routes/plan.routes.js";
import companyRoutes from "./routes/company.routes.js";
import platformAdminRoutes from "./routes/platformAdmin.routes.js";
import roleRoutes from "./routes/role.routes.js";
import userRoutes from "./routes/user.routes.js";
import dayPlanRoutes from "./routes/dayPlan.routes.js";
import tourPlanRoutes from "./routes/tourPlan.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import clientRoutes from "./routes/client.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import territoryRoutes from "./routes/territory.routes.js";
import locationRoutes from "./routes/location.routes.js";
import adminDashboardRoutes from "./routes/adminDashboard.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import todoRoutes from "./routes/todo.routes.js";
import saleRoutes from "./routes/sale.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";
import hrRoutes from "./routes/hr.routes.js";
import adminReportsRoutes from "./routes/adminreports.routes.js";
import payrollRoutes from "./routes/payroll.routes.js";
import dashboardUserRoutes from "./routes/dashboardUser.routes.js";
import dashboardRoleRoutes from "./routes/dashboardRole.routes.js";
import aiRoutes from "./routes/ai.routes.js";

// Platform Administration Routes
import platformAuthRoutes from "./routes/platform/auth.routes.js";
import platformCompanyRoutes from "./routes/platform/company.routes.js";
import platformRoleRoutes from "./routes/platform/role.routes.js";
import platformAdminRoutes_v2 from "./routes/platform/admin.routes.js";
import platformComplaintRoutes from "./routes/platform/complaint.routes.js";
import platformBillingRoutes from "./routes/platform/billing.routes.js";
import platformDashboardRoutes from "./routes/platform/dashboard.routes.js";
import initSubscriptionCron from "./services/cron.service.js";

import { getISTDate, formatDateKey } from "./utils/DateUtils.js";

import errorHandler from "./middleware/error.middleware.js";
import { ChatRoom, Message, User, Notification, Client, TourPlan, ToDo } from "./models/index.js";
import { sendWebPushToAdmins, createNotification } from "./controllers/notification.controller.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});
app.set("io", io);
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      initSubscriptionCron();
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
  }
};



app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use("/uploads", express.static(path.resolve("public/uploads")));

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/platform-admins", platformAdminRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/day-plans", dayPlanRoutes);
app.use("/api/tour-plans", tourPlanRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/territories", territoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/admin", adminDashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/admin-reports", adminReportsRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/dashboard-users", dashboardUserRoutes);
app.use("/api/dashboard-roles", dashboardRoleRoutes);
app.use("/api/ai", aiRoutes);

// Register Platform APIs
app.use("/api/platform/auth", platformAuthRoutes);
app.use("/api/platform/companies", platformCompanyRoutes);
app.use("/api/platform/roles", platformRoleRoutes);
app.use("/api/platform/admins", platformAdminRoutes_v2);
app.use("/api/platform/complaints", platformComplaintRoutes);
app.use("/api/platform/billing", platformBillingRoutes);
app.use("/api/platform/dashboard", platformDashboardRoutes);

app.get("/", (req, res) => res.send("Pharma API running"));

/* ── SOCKET.IO ─────────────────────────────────────────────────────────────── */
const onlineUsers = new Map();

io.on("connection", async (socket) => {
  console.log("🔌 User connected:", socket.id);
  const userId = socket.handshake.query.userId ? String(socket.handshake.query.userId) : null;
  const companyId = socket.handshake.query.companyId;
  const role = socket.handshake.query.role; // "ADMIN" | "USER"

  if (userId) {
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true });
    } catch (err) { }
    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
    console.log(`[Socket] User ${userId} joined private room user:${userId}`);

    // Safety check: join all currently active chat rooms too
    const activeRooms = await ChatRoom.find({ members: userId });
    activeRooms.forEach(r => {
      socket.join(String(r._id));
      console.log(`[Socket] User ${userId} auto-joined room ${r._id}`);
    });

    io.emit("userOnline", userId);

    // Admin joins company admin room for location broadcasts
    if (role === "ADMIN") {
      socket.join(`company:${companyId}:admins`);
    }
  }

  // ── Chat rooms ────────────────────────────────────────────────────────────
  socket.on("joinRoom", (roomId) => socket.join(roomId));

  socket.on("sendMessage", async (data) => {
    try {
      const { roomId, senderId, text } = data;
      const message = await Message.create({
        companyId,
        roomId,
        senderId,
        text,
        seenBy: [senderId],
      });
      await ChatRoom.findByIdAndUpdate(roomId, {
        lastMessage: text,
        lastMessageAt: new Date(),
      });
      io.to(roomId).emit("newMessage", message);
    } catch (err) {
      console.log("Socket sendMessage Error:", err.message);
    }
  });

  socket.on("messageDelivered", async ({ messageId, roomId }) => {
    console.log(`[Socket] Message ${messageId} delivered in room ${roomId}`);
    await Message.findByIdAndUpdate(messageId, { deliveryStatus: "DELIVERED" });

    // Sync ChatRoom lastMessage if it matches this message
    await ChatRoom.updateOne(
      { _id: roomId, "lastMessage.messageId": messageId },
      { $set: { "lastMessage.deliveryStatus": "DELIVERED" } }
    );

    const roomIdStr = String(roomId);
    io.to(roomIdStr).emit("updateMessageStatus", { roomId: roomIdStr, messageId, status: "DELIVERED" });

    // Also notify individual users
    const room = await ChatRoom.findById(roomId);
    if (room) {
      room.members.forEach(mId => {
        io.to(`user:${String(mId)}`).emit("updateMessageStatus", { roomId: roomIdStr, messageId, status: "DELIVERED" });
      });
    }
  });

  socket.on("markSeen", async ({ roomId, userId }) => {
    console.log(`[Socket] User ${userId} marking room ${roomId} as SEEN`);
    const roomIdStr = String(roomId);
    await Message.updateMany(
      { roomId: roomIdStr, senderId: { $ne: userId }, deliveryStatus: { $ne: "SEEN" } },
      { $addToSet: { seenBy: userId }, $set: { deliveryStatus: "SEEN" } }
    );

    // Sync ChatRoom lastMessage status
    await ChatRoom.updateOne(
      { _id: roomIdStr, "lastMessage.senderId": { $ne: userId } },
      { $set: { "lastMessage.deliveryStatus": "SEEN" } }
    );

    io.to(roomIdStr).emit("updateMessageStatus", { roomId: roomIdStr, status: "SEEN", userId });
    io.to(roomIdStr).emit("messagesSeen", { roomId: roomIdStr, userId });

    const resultRoom = await ChatRoom.findById(roomId);
    if (resultRoom) {
      resultRoom.members.forEach(mId => {
        const uRoom = `user:${String(mId)}`;
        io.to(uRoom).emit("updateMessageStatus", { roomId: roomIdStr, status: "SEEN", userId });
        io.to(uRoom).emit("messagesSeen", { roomId: roomIdStr, userId });
      });
    }
  });

  socket.on("messageDelivered", async ({ messageId, roomId }) => {
    await Message.findByIdAndUpdate(messageId, { deliveryStatus: "DELIVERED" });
    if (roomId) {
      io.to(roomId).emit("updateMessageStatus", { messageId, status: "DELIVERED", roomId });
      const r = await ChatRoom.findById(roomId);
      if (r) {
        r.members.forEach(mId => io.to(`user:${mId.toString()}`).emit("updateMessageStatus", { messageId, status: "DELIVERED", roomId }));
      }
    } else {
      io.emit("updateMessageStatus", { messageId, status: "DELIVERED" });
    }
  });

  socket.on("typing", async ({ roomId, userId }) => {
    socket.to(roomId).emit("userTyping", { userId, roomId });
    const r = await ChatRoom.findById(roomId);
    if (r) {
      r.members.forEach(mId => io.to(`user:${mId.toString()}`).emit("userTyping", { userId, roomId }));
    }
  });

  socket.on("stopTyping", async ({ roomId, userId }) => {
    socket.to(roomId).emit("userStopTyping", { userId, roomId });
    const r = await ChatRoom.findById(roomId);
    if (r) {
      r.members.forEach(mId => io.to(`user:${mId.toString()}`).emit("userStopTyping", { userId, roomId }));
    }
  });

  // ── Real-time location from mobile app ────────────────────────────────────
  socket.on("updateLocation", async (data) => {
    const { userId: uid, companyId: cid, latitude, longitude } = data;
    if (!uid || !latitude || !longitude) return;

    try {
      await User.findByIdAndUpdate(uid, {
        lastLocation: { latitude, longitude, updatedAt: new Date() },
        lastActiveAt: new Date(),
        isOnline: true,
      });

      io.to(`company:${cid}:admins`).emit("locationUpdate", {
        userId: uid,
        latitude,
        longitude,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error("Socket updateLocation error:", err.message);
    }
  });

  socket.on("disconnect", async () => {
    console.log("❌ User disconnected:", socket.id);
    if (userId) {
      onlineUsers.delete(userId);
      try {
        const lastActiveAt = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastActiveAt });
        io.emit("userOffline", { userId, lastActiveAt });
      } catch (err) { }
    }
  });
});



app.use((req, res) => res.status(404).json({ message: "API not found" }));
app.use(errorHandler);


/* ── CRON JOBS ──────────────────────────────────────────────────────────────── */

// Cron 1 — Every day at 8:00 AM: Client birthday & anniversary notifications
cron.schedule("0 8 * * *", async () => {
  console.log("[Cron] Running client special date notifications...");
  try {
    const now = getISTDate();
    const todayMonth = now.getUTCMonth() + 1; // 1-12 (Using UTC because we already added 5.5h to Date)
    const todayDay = now.getUTCDate();

    // Find all active clients with dob or anniversary matching today
    const clients = await Client.find({ status: "active" })
      .select("name dob anniversary specialDateType createdBy companyId")
      .populate("createdBy", "_id name managerId companyId");

    for (const client of clients) {
      const owner = client.createdBy;
      if (!owner) continue;

      let isSpecialDay = false;
      let eventLabel = "";

      if (client.specialDateType === "birthday" && client.dob) {
        const dobDate = new Date(client.dob);
        if (dobDate.getMonth() + 1 === todayMonth && dobDate.getDate() === todayDay) {
          isSpecialDay = true;
          eventLabel = "birthday";
        }
      } else if (client.specialDateType === "anniversary" && client.anniversary) {
        const annDate = new Date(client.anniversary);
        if (annDate.getMonth() + 1 === todayMonth && annDate.getDate() === todayDay) {
          isSpecialDay = true;
          eventLabel = "anniversary";
        }
      }

      if (isSpecialDay) {
        await createNotification({
          companyId: client.companyId,
          recipientId: owner._id,
          category: "CLIENT_SPECIAL_DATE",
          title: `🎉 ${client.name}'s ${eventLabel} today!`,
          body: `Don't forget to wish ${client.name} on their ${eventLabel}. Plan a visit or call.`,
          relatedUserId: owner._id,
          metadata: { clientId: client._id.toString(), clientName: client.name, eventLabel }
        });
      }
    }
    console.log("[Cron] Client special date notifications done.");
  } catch (err) {
    console.error("[Cron] Client special date error:", err.message);
  }
}, { timezone: "Asia/Kolkata" });

// Cron 2 — Every day at 7:30 AM: Morning tour plan summary for users
// cron.schedule("30 7 * * *", async () => {
//   console.log("[Cron] Running morning tour plan notifications...");
//   try {
//     const now = getISTDate();
//     const month = now.getUTCMonth() + 1;
//     const year = now.getUTCFullYear();
//     const todayStr = formatDateKey(now);

//     // Find all APPROVED tour plans for current month/year
//     const tourPlans = await TourPlan.find({
//       month,
//       year,
//       "approval.status": "APPROVED"
//     }).populate("userId", "_id name companyId");

//     for (const tp of tourPlans) {
//       const planForToday = tp.plans.find(
//         p => p.date && p.date.toISOString().split("T")[0] === todayStr
//       );

//       if (!planForToday) continue;

//       const workType = planForToday.workType || "FIELD";
//       await createNotification({
//         companyId: tp.userId.companyId,
//         recipientId: tp.userId._id,
//         category: "TOUR_PLAN",
//         title: "📅 Good Morning! Today's Tour Plan",
//         body: `Your work type today is ${workType}. Have a productive day!`,
//         relatedUserId: tp.userId._id,
//         redirectTo: "TourPlan",
//         metadata: { tourPlanId: tp._id.toString(), date: todayStr, workType }
//       });
//     }
//     console.log("[Cron] Morning tour plan notifications done.");
//   } catch (err) {
//     console.error("[Cron] Morning tour plan error:", err.message);
//   }
// }, { timezone: "Asia/Kolkata" });

// Cron 3 — Every minute: ToDo 10-minute reminders
const remindersSent = new Set(); // in-memory dedup per restart
cron.schedule("* * * * *", async () => {
  try {
    const now = getISTDate();
    const tenMinsLater = new Date(now.getTime() + 10 * 60 * 1000);

    const todayStr = formatDateKey(now);

    // Format the target time window as HH:mm
    const padZ = n => String(n).padStart(2, "0");
    const targetHour = tenMinsLater.getUTCHours();
    const targetMin = tenMinsLater.getUTCMinutes();
    const targetTime = `${padZ(targetHour)}:${padZ(targetMin)}`;

    const todos = await ToDo.find({
      date: todayStr,
      time: targetTime
    }).populate("userId", "_id name companyId");

    for (const todo of todos) {
      const key = `${todo._id}-${todayStr}-${targetTime}`;
      if (remindersSent.has(key)) continue;
      remindersSent.add(key);

      await createNotification({
        companyId: todo.companyId,
        recipientId: todo.userId._id,
        category: "TODO_REMINDER",
        title: `⏰ Reminder: ${todo.title}`,
        body: `Your ${todo.type} "${todo.title}" starts in 10 minutes at ${todo.time}`,
        relatedUserId: todo.userId._id,
        redirectTo: "ToDo",
        metadata: { todoId: todo._id.toString(), time: todo.time, type: todo.type }
      });
    }
  } catch (err) {
    console.error("[Cron] ToDo reminder error:", err.message);
  }
}, { timezone: "Asia/Kolkata" });

startServer();
export default app;
export { io };

