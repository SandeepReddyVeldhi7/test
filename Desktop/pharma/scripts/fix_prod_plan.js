import mongoose from "mongoose";
import { Plan } from "../models/index.js";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = "mongodb+srv://veldhisandeepreddy_db_user:asX2rRygalmCaEKT@cluster0.bhcuzlm.mongodb.net/pharma";

const fixPlan = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to Production MongoDB");

        const planId = "69f842d3e4d328c8563c54e6";
        const plan = await Plan.findById(planId);
        
        if (!plan) {
            console.error("❌ Plan not found with ID:", planId);
            process.exit(1);
        }

        console.log(`Current permissions count: ${plan.permissions.length}`);

        const permissionsToAdd = ["NOTIFICATIONS", "HR_DATA"];
        let added = false;

        permissionsToAdd.forEach(p => {
            if (!plan.permissions.includes(p)) {
                plan.permissions.push(p);
                console.log(`➕ Adding permission: ${p}`);
                added = true;
            }
        });

        if (added) {
            await plan.save();
            console.log("✅ Plan updated successfully!");
        } else {
            console.log("ℹ️ Permissions already exist in the plan.");
        }

        process.exit(0);
    } catch (error) {
        console.error("❌ Error updating plan:", error);
        process.exit(1);
    }
};

fixPlan();
