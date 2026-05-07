import mongoose from "mongoose";
import { ActivityLog } from "./models/index.js";

const dbUri = "mongodb://localhost:27017/pharma"; // Assuming default

async function check() {
  await mongoose.connect(dbUri);
  console.log("Connected to DB");

  const userId = "69d5f72a236fc1060d604f60";
  const from = "2026-04-10T18:30:00.000Z";
  const to = "2026-04-11T18:29:59.999Z";

  const logs = await ActivityLog.find({
    userId,
    timestamp: { $gte: new Date(from), $lte: new Date(to) }
  });

  console.log("Logs found:", logs.length);
  if (logs.length > 0) {
    console.log("First log:", logs[0]);
  } else {
    // Try without range to see if user exists
    const totalLogs = await ActivityLog.countDocuments({ userId });
    console.log("Total logs for user:", totalLogs);
    
    const sample = await ActivityLog.findOne({ userId });
    if (sample) {
      console.log("Sample log timestamp:", sample.timestamp);
    }
  }

  await mongoose.disconnect();
}

check();
