import mongoose from 'mongoose';

async function checkAnushaTPRaw() {
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

        console.log(`\n--- Root Document Metadata ---`);
        console.log(`Document Created At: ${plan.createdAt}`);
        console.log(`Document Last Updated At: ${plan.updatedAt}`);
        console.log(`Approval Status: ${plan.approval.status}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkAnushaTPRaw();
