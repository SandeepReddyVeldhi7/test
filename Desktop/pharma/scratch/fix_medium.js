import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function fixMedium() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pharma');
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection('companies');
    const targetId = new mongoose.Types.ObjectId('69d38f14a8f68261a61d92a8');

    const doc = await collection.findOne({ _id: targetId });
    if (!doc) {
      console.log("❌ Document not found at all!");
      process.exit(1);
    }

    console.log('--- BEFORE ---');
    console.log(JSON.stringify(doc, null, 2));

    // Create a clean set of updates
    const updateOp = {
      $set: { accessKey: '12505B8D273C1' },
      $unset: {}
    };

    // Identify and unset all keys that look like accessKey but aren't exact
    Object.keys(doc).forEach(key => {
      if (key.trim().toLowerCase() === 'accesskey' && key !== 'accessKey') {
        updateOp.$unset[key] = "";
        console.log(`⚠️ Removing shadow field: "${key}"`);
      }
    });

    if (Object.keys(updateOp.$unset).length === 0) {
      delete updateOp.$unset;
    }

    await collection.updateOne({ _id: targetId }, updateOp);
    console.log('\n--- AFTER ---');
    const fresh = await collection.findOne({ _id: targetId });
    console.log(JSON.stringify(fresh, null, 2));

    console.log('\n✅ BRUTE FORCE REPAIR SUCCESSFUL');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixMedium();
