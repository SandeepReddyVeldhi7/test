import mongoose from 'mongoose';

async function checkData() {
    const MONGO_URI = 'mongodb://localhost:27017/pharma';
    const userId = '69d3b085a8f68261a61d932e';
    const companyId = '69d38f14a8f68261a61d92a8';

    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const expenses = await db.collection('expenses').find({
            userId: new mongoose.Types.ObjectId(userId),
            companyId: new mongoose.Types.ObjectId(companyId)
        }).toArray();

        console.log(`Found ${expenses.length} documents for User ${userId}`);
        if (expenses.length > 0) {
            expenses.forEach((doc, index) => {
                console.log(`\nDocument ${index + 1}:`);
                console.log(`ID: ${doc._id}`);
                console.log(`Month/Year: ${doc.month}/${doc.year}`);
                console.log(`Days in document: ${doc.days?.length || 0}`);
                if (doc.days) {
                    doc.days.forEach(day => {
                        console.log(` - Date: ${day.date}, Status: ${day.status}`);
                    });
                }
            });
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkData();
