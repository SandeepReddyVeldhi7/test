import mongoose from "mongoose";
import dotenv from "dotenv";
import DashboardUser from "../models/DashboardUser.model.js";
import DashboardRole from "../models/DashboardRole.model.js";

// Load environment variables
dotenv.config();

const seed = async () => {
  try {
    // Force 127.0.0.1 if localhost fails, but use .env value first
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pharma";
    console.log("Connecting to:", mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const companyId = "69d38f14a8f68261a61d92a8";
    const roleId = "69d38f14a8f68261a61d92aa";
    const userId = "69d38f14a8f68261a61d92ac";

    console.log("🚀 Seeding Dashboard Role...");
    await DashboardRole.findOneAndUpdate(
      { _id: roleId },
      {
        companyId,
        name: "MediumA Admin",
        permissions: ["Dashboard", "Analytics", "Administration", "Finance", "Dashboard Users"],
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log("✅ Dashboard Role seeded");

    console.log("🚀 Seeding Dashboard User...");
    await DashboardUser.findOneAndUpdate(
      { _id: userId },
      {
        companyId,
        name: "MediumA",
        email: "veldhisandeep@gmail.com",
        employeeId: "MEDIUM-2026-SA-001",
        roleId,
        password: "$2b$10$U/93nDjoGYJfZ/EaU9E.NOchsLNaCkeHmfUVtcZDK8mkX3V5wuVKK",
        isActive: true,
        isVerified: true,
        mobile: "9100760587",
        photo: "/uploads/profiles/1775890829014-662730996.jpeg",
        dailyAllowance: 250,
        fcmTokens: [
          "ExponentPushToken[sQfLKJM-nCcp1dZtnFyJ7-]",
          "ExponentPushToken[2AkhhHAbQoEvIadEBKcuFG]"
        ]
      },
      { upsert: true, new: true }
    );
    console.log("✅ Dashboard User seeded");

    console.log("\n🎉 Seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

seed();
