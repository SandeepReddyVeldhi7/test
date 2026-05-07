import mongoose from 'mongoose';
import { User, ActivityLog, TourPlan, Client } from './models/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function compareReports() {
    try {
        await mongoose.connect('mongodb://localhost:27017/pharma');
        console.log("Connected to MongoDB");

        const userId = '69bbf81a381673e7eb8711f9'; // Sandeep
        const companyId = '65967ee38dcba15830843477'; // Found in previous steps
        
        const year = 2026;
        const month = 3; // March

        console.log("--- REVIEW REPORT (Single Month) ---");
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
        
        const reviewAdded = await Client.countDocuments({
            companyId: new mongoose.Types.ObjectId(companyId),
            $or: [{ createdBy: new mongoose.Types.ObjectId(userId) }, { employeeId: new mongoose.Types.ObjectId(userId) }],
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });
        console.log(`Review Added (Mar): ${reviewAdded}`);

        console.log("\n--- FULL ASSESSMENT (Range with Mar included) ---");
        const fromMonth = 1;
        const toMonth = 3;
        
        let fullTotalAdded = 0;
        for (let m = fromMonth; m <= toMonth; m++) {
            const s = new Date(year, m - 1, 1);
            const e = new Date(year, m, 0, 23, 59, 59, 999);
            const added = await Client.countDocuments({
                companyId: new mongoose.Types.ObjectId(companyId),
                $or: [{ createdBy: new mongoose.Types.ObjectId(userId) }, { employeeId: new mongoose.Types.ObjectId(userId) }],
                createdAt: { $gte: s, $lte: e }
            });
            console.log(`Month ${m} Added: ${added}`);
            fullTotalAdded += added;
        }
        console.log(`Full Assessment Total Added: ${fullTotalAdded}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

compareReports();
