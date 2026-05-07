import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { DashboardUser, DashboardRole, User } from '../models/index.js';

dotenv.config();

async function checkCurrentUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Find the user by email or name if possible, or just list all dashboard users
    const users = await DashboardUser.find({}).populate('roleId');
    console.log(`Found ${users.length} Dashboard Users:`);
    
    for (const u of users) {
      console.log(`- ${u.name} (Role: ${u.roleId?.name || 'No Role'}, Company: ${u.companyId})`);
      if (u.roleId) {
        console.log(`  Permissions: ${u.roleId.permissions?.join(', ')}`);
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkCurrentUser();
