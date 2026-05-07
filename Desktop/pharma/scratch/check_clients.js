import mongoose from 'mongoose';
import Client from '../models/Client.model.js';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/pharma');
  const userId = '69d3b085a8f68261a61d932e';
  const clients = await Client.find({ employeeId: userId });
  console.log('Total clients found:', clients.length);
  clients.forEach(c => {
    const priority = c.priority || '';
    const charCodes = priority.split('').map(char => char.charCodeAt(0)).join(',');
    console.log(`ID: ${c._id}, Priority: [${priority}] (Codes: ${charCodes}), Status: ${c.status}`);
  });
  process.exit(0);
}

check();
