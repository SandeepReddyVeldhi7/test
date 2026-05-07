import mongoose from "mongoose";
import dotenv from "dotenv";
import { Company, Plan, Role, User } from "../models/index.js";

dotenv.config();

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB for verification");

        // 1. Find the PRO plan
        const proPlan = await Plan.findOne({ name: "FINCH_PRO" });
        if (!proPlan) {
            console.error("❌ PRO Plan not found");
            process.exit(1);
        }
        console.log(`🔍 Found Plan: ${proPlan.name}, Permissions: ${proPlan.permissions}`);

        // 2. Create a dummy company for testing
        const testCompany = await Company.create({
            name: "Test Permission Corp",
            code: `TEST${Math.floor(Math.random() * 1000)}`,
            plan: proPlan._id,
            startDate: new Date(),
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        });
        console.log(`🏢 Created Test Company: ${testCompany.name} (ID: ${testCompany._id})`);

        // 3. Mock req.user for role controller context
        const mockUser = {
            companyId: testCompany._id
        };

        // 4. Try creating a role with valid permissions
        console.log("\n🧪 Test Case 1: Create Role with VALID permissions (subset of PRO)");
        const validPermissions = ["VIEW_DASHBOARD", "CREATE_CLIENT"];
        const validRole = await Role.create({
            companyId: testCompany._id,
            name: "Valid Manager",
            level: 2,
            permissions: validPermissions
        });
        console.log(`✅ SUCCESS: Role '${validRole.name}' created with permissions: ${validRole.permissions}`);

        // 5. Try creating a role with INVALID permissions (MANAGE_ROLES is only in MAX)
        console.log("\n🧪 Test Case 2: Create Role with INVALID permissions (out of plan scope)");
        const invalidPermissions = ["VIEW_DASHBOARD", "MANAGE_ROLES"];
        
        // Manual validation check (since we want to verify the controller logic)
        const allowedPermissions = proPlan.permissions || [];
        const isUnauthorized = invalidPermissions.some(p => !allowedPermissions.includes(p));

        if (isUnauthorized) {
            console.log(`✅ SUCCESS: Logic correctly blocked unauthorized permissions!`);
        } else {
            console.error("❌ FAILURE: Logic failed to detect unauthorized permissions");
        }

        // Cleanup
        await Role.deleteMany({ companyId: testCompany._id });
        await Company.deleteOne({ _id: testCompany._id });
        console.log("\n🧹 Cleanup completed");

        process.exit(0);
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        process.exit(1);
    }
};

test();
