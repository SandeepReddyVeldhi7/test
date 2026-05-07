import mongoose from 'mongoose';
import Complaint from '../models/Complaint.model.js';
import Company from '../models/Company.model.js';
import User from '../models/User.model.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkComplaint() {
    try {
        console.log("Connecting to:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const id = '69e1ff77181093e3125e5aff';
        const complaint = await Complaint.findById(id).populate('companyId').populate('userId');
        
        if (!complaint) {
            console.log(`Complaint with ID ${id} NOT found in database.`);
        } else {
            console.log("Complaint found:");
            console.log(JSON.stringify(complaint, null, 2));
        }

        const totalCount = await Complaint.countDocuments();
        console.log(`Total complaints in collection: ${totalCount}`);

        const sample = await Complaint.find().limit(5);
        console.log("Latest 5 complaints IDs:", sample.map(c => c._id));

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

checkComplaint();
