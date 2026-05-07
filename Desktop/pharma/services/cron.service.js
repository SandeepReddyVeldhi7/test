import cron from "node-cron";
import Company from "../models/Company.model.js";
import User from "../models/User.model.js";
import { sendSubscriptionReminder } from "./email.service.js";

/**
 * Subscription Reminder Service
 * Scans companies daily and sends renewal reminders at 30, 15, and 3 days before expiry.
 */
const initSubscriptionCron = () => {
  // Run every day at 00:00 (Midnight)
  cron.schedule("0 0 * * *", async () => {
    console.log("🕒 Running Subscription Expiry Scan...");
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Thresholds in days
      const thresholds = [
        { days: 30, tag: "30_DAYS" },
        { days: 15, tag: "15_DAYS" },
        { days: 3, tag: "3_DAYS" }
      ];

      for (const threshold of thresholds) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + threshold.days);
        
        const nextDay = new Date(targetDate);
        nextDay.setDate(targetDate.getDate() + 1);

        // Find companies expiring on targetDate that haven't received this reminder yet
        const companies = await Company.find({
          "subscription.expiryDate": { $gte: targetDate, $lt: nextDay },
          "subscription.status": "ACTIVE",
          "subscription.lastReminderSent": { $ne: threshold.tag }
        });

        console.log(`🔍 Found ${companies.length} companies for ${threshold.tag} reminder.`);

        for (const company of companies) {
          try {
            // Find the Super Admin user for this company to get their name
            const adminUser = await User.findOne({ 
              companyId: company._id,
              // roleId: superAdminRoleId // We could search by role, but contactEmail is safer if roles vary
            });

            const recipientEmail = company.contactEmail || (adminUser ? adminUser.email : null);
            if (!recipientEmail) {
              console.warn(`⚠️ No contact email found for company: ${company.name}`);
              continue;
            }

            await sendSubscriptionReminder({
              to: recipientEmail,
              name: adminUser ? adminUser.name : "Admin",
              orgName: company.name,
              expiryDate: company.subscription.expiryDate,
              daysLeft: threshold.days,
              renewUrl: "https://pharma-admin-five.vercel.app/login"
            });

            // Mark as sent
            company.subscription.lastReminderSent = threshold.tag;
            await company.save();
            
            console.log(`✅ ${threshold.tag} reminder sent to ${company.name}`);
          } catch (err) {
            console.error(`❌ Failed to send ${threshold.tag} reminder to ${company.name}:`, err.message);
          }
        }
      }
    } catch (globalErr) {
      console.error("❌ CRITICAL: Subscription Cron Job Failed:", globalErr.message);
    }
  });

  console.log("🚀 Subscription Expiry Cron Job Initialized.");
};

export default initSubscriptionCron;
