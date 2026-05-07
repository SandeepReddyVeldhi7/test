import mongoose from "mongoose";
import dotenv from "dotenv";
import { MonthlyTarget, MonthlyAchievement } from "../models/index.js";

dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB...");

        // 1. Migrate Targets
        console.log("Migrating Targets...");
        const allTargets = await mongoose.connection.collection("monthlytargets").find({}).toArray();
        console.log(`Found ${allTargets.length} individual target documents.`);

        const groupedTargets = {};
        for (const t of allTargets) {
            const key = `${t.userId}_${t.year}`;
            if (!groupedTargets[key]) {
                groupedTargets[key] = {
                    userId: t.userId,
                    companyId: t.companyId,
                    year: t.year,
                    targets: [],
                    createdBy: t.createdBy
                };
            }
            // Only add if month doesn't already exist in this group (to avoid duplicates)
            if (!groupedTargets[key].targets.some(item => item.month === t.month)) {
                groupedTargets[key].targets.push({
                    month: t.month,
                    target: t.target || 0
                });
            }
        }

        // Clear and Repopulate Targets
        await MonthlyTarget.deleteMany({});
        const targetDocs = Object.values(groupedTargets);
        if (targetDocs.length > 0) {
            await MonthlyTarget.insertMany(targetDocs);
        }
        console.log(`Successfully migrated targets into ${targetDocs.length} yearly documents.`);

        // 2. Migrate Achievements
        console.log("Migrating Achievements...");
        const allAchievements = await mongoose.connection.collection("monthlyachievements").find({}).toArray();
        console.log(`Found ${allAchievements.length} individual achievement documents.`);

        const groupedAchievements = {};
        for (const a of allAchievements) {
            const key = `${a.userId}_${a.year}`;
            if (!groupedAchievements[key]) {
                groupedAchievements[key] = {
                    userId: a.userId,
                    companyId: a.companyId,
                    year: a.year,
                    achievements: []
                };
            }
            if (!groupedAchievements[key].achievements.some(item => item.month === a.month)) {
                groupedAchievements[key].achievements.push({
                    month: a.month,
                    achievement: a.achievement || 0,
                    secondary: a.secondary || 0
                });
            }
        }

        // Clear and Repopulate Achievements
        await MonthlyAchievement.deleteMany({});
        const achievementDocs = Object.values(groupedAchievements);
        if (achievementDocs.length > 0) {
            await MonthlyAchievement.insertMany(achievementDocs);
        }
        console.log(`Successfully migrated achievements into ${achievementDocs.length} yearly documents.`);

        console.log("Migration complete!");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrate();
