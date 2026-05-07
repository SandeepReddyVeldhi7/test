import mongoose from 'mongoose';

async function checkAnushaTP() {
    const MONGO_URI = 'mongodb://localhost:27017/pharma';

    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;

        // 1. Find the user "Anusha"
        const user = await db.collection('users').findOne({ name: /Anusha/i });
        
        if (!user) {
            console.log("No user named 'Anusha' found.");
            await mongoose.disconnect();
            return;
        }

        console.log(`Found User: ${user.name} (ID: ${user._id})`);

        // 2. Find their Tour Plans
        const plans = await db.collection('tourplans').find({ userId: user._id }).toArray();

        if (plans.length === 0) {
            console.log("No tour plans found for Anusha.");
        } else {
            plans.forEach((tp, i) => {
                console.log(`\nPlan ${i + 1}:`);
                console.log(`Month/Year: ${tp.month}/${tp.year}`);
                console.log(`Status: ${tp.approval?.status || 'NONE'}`);
                console.log(`Days in plan: ${tp.plans?.length || 0}`);
                if (tp.approval?.comment) console.log(`Comment: ${tp.approval.comment}`);
            });
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkAnushaTP();
