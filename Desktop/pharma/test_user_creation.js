import mongoose from 'mongoose';
import { User, Role, Company, Compensation, MonthlyTarget } from './models/index.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function runTest() {
  try {
    // 1. Connect
    await mongoose.connect('mongodb://localhost:27017/pharma');
    console.log('✅ Connected to DB');

    // 2. Prepare Data
    const company = await Company.findOne();
    const role = await Role.findOne({ companyId: company._id });
    
    if (!company || !role) {
      console.error('❌ Missing company or role to perform test');
      process.exit(1);
    }

    const testEmail = `test_user_${Date.now()}@example.com`;
    const password = 'testPassword123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const payload = {
      name: 'Test Salary User',
      email: testEmail.toLowerCase(),
      employeeId: `EMP-${Date.now()}`,
      roleId: role._id,
      companyId: company._id,
      password: hashedPassword,
      designation: 'Senior Architect',
      dailyAllowance: 500,
      isActive: true
    };

    // 3. Create User
    const user = await User.create(payload);
    console.log('✅ User Created:', user._id);

    // 4. Test saveSalaryRevisions Logic (Manually call or use controller logic)
    // We'll mimic the controller logic directly here
    const salaryRevisions = [
      {
        effectiveFrom: '2024-04',
        label: 'FY 2024-25 Initial',
        designation: 'Senior Architect',
        components: [
          { label: 'Basic Salary', value: 50000 },
          { label: 'HRA', value: 20000 }
        ]
      },
      {
        effectiveFrom: '2025-04',
        label: 'FY 2025-26 Revision',
        designation: 'Technical Lead',
        components: [
          { label: 'Basic Salary', value: 60000 },
          { label: 'HRA', value: 25000 }
        ]
      }
    ];

    async function saveSalaryRevisions(userId, companyId, revisions) {
      for (const rev of revisions) {
        const totalAmount = (rev.components || []).reduce((sum, c) => sum + (Number(c.value) || 0), 0);
        await Compensation.findOneAndUpdate(
          { userId, effectiveFrom: rev.effectiveFrom },
          {
            companyId,
            label: rev.label,
            designation: rev.designation || "N/A",
            components: rev.components,
            totalAmount: totalAmount,
            isLocked: true
          },
          { upsert: true, new: true }
        );
      }
    }

    await saveSalaryRevisions(user._id, company._id, salaryRevisions);
    console.log('✅ Salary Revisions Saved');

    // 5. Test Targets Logic
    const targets = [
      {
        year: 2024,
        targets: [
          { month: 'APR', target: 1000000 },
          { month: 'MAY', target: 1200000 }
        ]
      }
    ];

    for (const yearData of targets) {
      await MonthlyTarget.findOneAndUpdate(
        { userId: user._id, year: yearData.year },
        {
          companyId: company._id,
          targets: yearData.targets,
        },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Performance Targets Saved');

    // 6. Verify Results
    const savedUser = await User.findById(user._id);
    const savedCompensations = await Compensation.find({ userId: user._id });
    const savedTargets = await MonthlyTarget.find({ userId: user._id });

    console.log('\n--- Verification Results ---');
    console.log('User Name:', savedUser.name);
    console.log('Daily Allowance:', savedUser.dailyAllowance);
    console.log('Salary Revisions Count:', savedCompensations.length);
    savedCompensations.forEach(c => {
      console.log(`  - ${c.label}: Total ${c.totalAmount} (Designation: ${c.designation})`);
    });
    console.log('Targets Count:', savedTargets.length);

    console.log('\n✅ TEST COMPLETE');
    process.exit(0);
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runTest();
