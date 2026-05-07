import mongoose from 'mongoose';
import Plan from './models/Plan.model.js';
import dotenv from 'dotenv';

dotenv.config();

const updatePlan = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const planId = '69f842d3e4d328c8563c54e6';
        const permissionsToAdd = ['HR_DATA', 'NOTIFICATIONS'];
        
        await Plan.findByIdAndUpdate(planId, { 
            $addToSet: { permissions: { $each: permissionsToAdd } } 
        });
        
        console.log('✅ Plan updated with HR_DATA and NOTIFICATIONS');
        process.exit(0);
    } catch (err) {
        console.error('❌ Update failed:', err.message);
        process.exit(1);
    }
};

updatePlan();
