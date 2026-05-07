import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Company, DashboardRole } from '../models/index.js';

dotenv.config();

async function provisionSuperAdminRoles() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const companies = await Company.find({});
    
    for (const company of companies) {
      const existingRole = await DashboardRole.findOne({ 
        companyId: company._id, 
        name: "SUPER_ADMIN" 
      });

      if (!existingRole) {
        console.log(`Provisioning SUPER_ADMIN role for: ${company.name}`);
        await DashboardRole.create({
          companyId: company._id,
          name: "SUPER_ADMIN",
          permissions: ["Dashboard", "Analytics", "Administration", "Finance", "Dashboard Users"]
        });
      } else {
        console.log(`SUPER_ADMIN role already exists for: ${company.name}`);
      }
    }

    console.log('Provisioning complete.');
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

provisionSuperAdminRoles();
