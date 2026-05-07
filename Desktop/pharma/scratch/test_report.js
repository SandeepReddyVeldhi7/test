import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getFullAssessmentReport } from '../controllers/reports.controller.js';

dotenv.config();

async function test() {
  console.log('Connecting to DB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  // The User ID we confirmed actually created clients in April
  const uid = '69db702eedd44d72c1145caa'; 
  const cid = '69db702eedd44d72c1145ca6';

  const req = {
    query: {
      userIds: uid,
      fromMonth: '4',
      toMonth: '4',
      year: '2026'
    },
    user: { companyId: cid }
  };

  const res = {
    json: (data) => {
      console.log('====================================');
      console.log('FULL ASSESSMENT REPORT GENERATED:');
      console.log(`User: ${data.data[0]?.user.name}`);
      console.log(`Added Clients: ${data.data[0]?.totals.addedClients}`);
      console.log(`Active Snapshot: ${data.data[0]?.totals.active}`);
      console.log('====================================');
      console.log(JSON.stringify(data, null, 2));
      process.exit(0);
    },
    status: () => res
  };

  const next = (err) => {
    console.error('REPORT FAILED WITH ERROR:', err);
    process.exit(1);
  };

  console.log('Calling getFullAssessmentReport...');
  await getFullAssessmentReport(req, res, next);
}

test().catch(err => {
  console.error('CRITICAL TEST ERROR:', err);
  process.exit(1);
});
