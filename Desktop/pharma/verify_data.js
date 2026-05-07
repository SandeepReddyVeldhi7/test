import mongoose from "mongoose";
import { User, Client, TourPlan, ActivityLog } from "./models/index.js";
import dotenv from "dotenv";

dotenv.config();

const DB_URI = process.env.MONGO_URI;

async function verifyData() {
  try {
    await mongoose.connect(DB_URI);
    console.log("Connected to DB");

    // April 2026 UTC Boundaries
    const start = new Date(Date.UTC(2026, 3, 1, 0, 0, 0, 0)); // April 1
    const end = new Date(Date.UTC(2026, 4, 0, 23, 59, 59, 999)); // April 30

    // 1. Find the likely user (recently active)
    const activeActivities = await ActivityLog.find().sort({ timestamp: -1 }).limit(1).populate("userId");
    if (activeActivities.length === 0) {
        console.log("No activities found to identify user.");
        process.exit();
    }
    const user = activeActivities[0].userId;
    console.log(`Checking data for User: ${user.name} (${user.employeeId})`);
    const uid = user._id;

    // 2. Count Added Clients
    const addedCount = await Client.countDocuments({
      companyId: user.companyId,
      createdBy: uid,
      createdAt: { $gte: start, $lte: end }
    });
    console.log(`Clients Added in April 2026: ${addedCount}`);

    // 3. Count Planned Calls
    const tourPlan = await TourPlan.findOne({ userId: uid, month: 4, year: 2026 });
    let planned = 0;
    if (tourPlan && tourPlan.plans) {
      tourPlan.plans.forEach(p => {
        planned += (p.clients?.length || 0);
      });
    }
    console.log(`Calls Planned in April 2026: ${planned}`);

    // 4. Count Visited Calls (DCR)
    const visitedLogs = await ActivityLog.find({
        userId: uid,
        action: "DCR",
        timestamp: { $gte: start, $lte: end }
    });
    const uniqueVisited = new Set(visitedLogs.map(l => l.clientId?.toString())).size;
    console.log(`Unique Clients Visited in April 2026: ${uniqueVisited}`);

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

verifyData();
