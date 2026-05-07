import mongoose from "mongoose";
import dotenv from "dotenv";
import { Plan } from "../models/index.js";

dotenv.config();

const plans = [
  {
    name: "FINCH_BASIC",
    price: 0,
    durationInDays: 365,
    maxUsers: 10,
    features: ["Basic dashboard", "Client management", "Activity tracking"],
    permissions: [
      "DAY_PLAN", "MY_ACTIVITY", "ADD_CLIENT", "EXPENSE", 
      "TOUR_PLAN", "TODO", "REPORTS"
    ],
    isCustom: false
  },
  {
    name: "FINCH_PRO",
    price: 5000,
    durationInDays: 365,
    maxUsers: 50,
    features: ["Advanced dashboard", "Client management", "Activity tracking", "Report viewing", "Client creation"],
    permissions: [
      "DAY_PLAN", "MY_ACTIVITY", "ADD_CLIENT", "EXPENSE", 
      "TOUR_PLAN", "SALE", "COMPLAINT", "TODO", "REPORTS",
      "CHAT", "NOTIFICATIONS", "CREATE_USER", "MAP_VIEW"
    ],
    isCustom: false
  },
  {
    name: "FINCH_MAX",
    price: 15000,
    durationInDays: 365,
    maxUsers: 200,
    features: ["Full suite", "User management", "Role management", "Territory management", "Advanced reports"],
    permissions: [
      "DAY_PLAN", "MY_ACTIVITY", "ADD_CLIENT", "EXPENSE", 
      "TOUR_PLAN", "SALE", "COMPLAINT", "LEAVES", "HOLIDAYS", 
      "PAY_SLIPS", "HR_DATA", "REPORTS", "CHAT", "NOTIFICATIONS", 
      "TODO", "CREATE_USER", "CREATE_ROLE", "MAP_VIEW", 
      "ASSESSMENT", "TARGET_VS_ACHIEVEMENT"
    ],
    isCustom: false
  }
];

const seedPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB for seeding");

    for (const planData of plans) {
      await Plan.findOneAndUpdate(
        { name: planData.name },
        planData,
        { upsert: true, new: true }
      );
      console.log(`🌱 Seeded/Updated plan: ${planData.name}`);
    }

    console.log("✅ Plan seeding completed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
};

seedPlans();
