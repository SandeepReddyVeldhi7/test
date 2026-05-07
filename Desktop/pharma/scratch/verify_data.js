import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Client } from '../models/index.js';

dotenv.config();

async function verify() {
  console.log('Connecting to DB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  const start = new Date(Date.UTC(2026, 3, 1)); // April 1st UTC
  const end = new Date(Date.UTC(2026, 4, 0, 23, 59, 59, 999)); // April 30th UTC

  const clients = await Client.find({
    createdAt: { $gte: start, $lte: end }
  });

  console.log(`DATA AUDIT FOR APRIL:`);
  clients.forEach(c => {
    console.log(`- ${c.name} | CreatedBy: ${c.createdBy} | CompanyId: ${c.companyId} | Status: ${c.status}`);
  });

  process.exit();
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
