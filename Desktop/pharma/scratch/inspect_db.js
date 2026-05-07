import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Company, DashboardRole, DashboardUser } from '../models/index.js';

dotenv.config();

async function checkCompanies() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const companies = await Company.find({});
    console.log(`Found ${companies.length} companies:`);
    
    for (const company of companies) {
      console.log(`- ${company.name} (${company._id})`);
      const roles = await DashboardRole.find({ companyId: company._id });
      console.log(`  Roles: ${roles.map(r => r.name).join(', ') || 'None'}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkCompanies();
