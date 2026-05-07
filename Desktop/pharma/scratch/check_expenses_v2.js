import mongoose from 'mongoose';

async function checkData() {
    const MONGO_URI = 'mongodb://localhost:27017/pharma';
    const userId = '69d3b085a8f68261a61d932e';
    const companyId = '69d38f14a8f68261a61d92a8';

    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        
        // Check total count
        const total = await db.collection('expenses').countDocuments();
        console.log(`Total documents in expenses collection: ${total}`);

        // Check for specific user (trying both ObjectId and String)
        const byObjId = await db.collection('expenses').countDocuments({
            userId: new mongoose.Types.ObjectId(userId),
            companyId: new mongoose.Types.ObjectId(companyId)
        });
        console.log(`Count by ObjectId: ${byObjId}`);

        const byString = await db.collection('expenses').countDocuments({
            userId: userId,
            companyId: companyId
        });
        console.log(`Count by String: ${byString}`);

        if (total > 0) {
            console.log("\nSample document structure:");
            const sample = await db.collection('expenses').findOne();
            console.log(JSON.stringify(sample, null, 2));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkData();
