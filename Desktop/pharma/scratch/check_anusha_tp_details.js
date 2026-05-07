import mongoose from 'mongoose';

async function checkAnushaTPDetails() {
    const MONGO_URI = 'mongodb://localhost:27017/pharma';

    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;

        const user = await db.collection('users').findOne({ name: /Anusha/i });
        const plan = await db.collection('tourplans').findOne({ userId: user._id, month: 5, year: 2026 });

        if (!plan) {
            console.log("Plan not found.");
            await mongoose.disconnect();
            return;
        }

        console.log(`\n--- Tour Plan Details (May 2026) ---`);
        console.log(`Status: ${plan.approval.status}`);
        console.log(`Rejected On: ${plan.approval.updatedAt || 'N/A'} (UTC)`);
        console.log(`Rejected By: ${plan.approval.reviewedBy || 'N/A'}`);
        console.log(`Rejection Message: ${plan.approval.comment || 'No comment provided'}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkAnushaTPDetails();
