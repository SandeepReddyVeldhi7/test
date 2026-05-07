import mongoose from 'mongoose';
import { User, ActivityLog, TourPlan, Client } from './models/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function findData() {
    try {
        await mongoose.connect('mongodb://localhost:27017/pharma');
        console.log("Connected to MongoDB");

        const user = await User.findOne({ name: /Sandeep/i });
        if (!user) {
            console.log("Sandeep not found");
            process.exit(0);
        }

        console.log(`Checking data for: ${user.name} (${user._id})`);

        const clients = await Client.find({ 
            $or: [{ createdBy: user._id }, { employeeId: user._id }] 
        }).sort({ createdAt: -1 });

        console.log("\n--- CLIENTS ---");
        clients.forEach(c => {
            console.log(`- ${c.name}: [${c.priority}] ${c.status} (Created: ${c.createdAt})`);
        });

        const logs = await ActivityLog.find({ 
            userId: user._id, 
            action: 'DCR' 
        }).sort({ timestamp: -1 });

        console.log("\n--- ACTIVITY LOGS (DCR) ---");
        logs.forEach(l => {
            console.log(`- Visit to ${l.clientId} at ${l.timestamp}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findData();
