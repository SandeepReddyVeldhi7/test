import { DayPlan, ActivityLog, TourPlan, User, Expense, Leave, Holiday } from "../models/index.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getISTDate } from "../utils/DateUtils.js";

/**
 * @desc Get monthly dashboard stats for the authenticated user
 * @route GET /api/dashboard/monthly
 * @access Private
 */
export const getMonthlyStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const companyId = req.user.companyId;

  const now = getISTDate();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  
  // Shift back to UTC for DB query boundaries (since MongoDB stores in UTC)
  startOfMonth.setTime(startOfMonth.getTime() - (5.5 * 60 * 60 * 1000));
  endOfMonth.setTime(endOfMonth.getTime() - (5.5 * 60 * 60 * 1000));

  // Fetch holidays for the current month and company
  const holidays = await Holiday.find({
    companyId,
    date: { $gte: startOfMonth, $lte: endOfMonth }
  });

  const holidayDateSet = new Set(holidays.map(h => new Date(h.date).getUTCDate()));

  // Calculate Target from Tour Plan
  const tourPlan = await TourPlan.findOne({
    userId,
    month: now.getUTCMonth() + 1,
    year: now.getUTCFullYear()
  });

  let clientsTarget = 0;
  if (tourPlan && tourPlan.plans) {
    clientsTarget = tourPlan.plans.reduce((sum, plan) => sum + (plan.clients?.length || 0), 0);
  }

  // 1. Achievements Metric: Total number of 'DCR' activity calls for the current month
  const clientsCovered = await ActivityLog.countDocuments({
    userId,
    action: "DCR",
    timestamp: { $gte: startOfMonth, $lte: endOfMonth }
  });

  // 2. Total Days (Month days excluding Sundays and Holidays)
  let totalDaysCount = 0;
  let sundaysCount = 0;
  let holidayCount = 0;
  // Use a temporary date object to avoid modifying startOfMonth
  let tempDate = new Date(startOfMonth);
  while (tempDate <= endOfMonth) {
    const dayOfMonth = tempDate.getUTCDate();
    const isSunday = tempDate.getUTCDay() === 0;
    const isHoliday = holidayDateSet.has(dayOfMonth);

    if (isSunday) {
      sundaysCount++;
    } else if (isHoliday) {
      holidayCount++;
    } else {
      totalDaysCount++;
    }
    tempDate.setUTCDate(dayOfMonth + 1);
  }

  // 3. Working Days (DayPlan entries where workType is a professional activity)
  const workingDays = await DayPlan.countDocuments({
    userId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
    workType: { $in: ["FIELD", "MEETING", "CRM", "JOINT_WORK"] }
  });

  // 4. Off Days (Sundays + Holidays + DayPlan entries marked as LEAVE or personal HOLIDAY)
  const leaveDays = await DayPlan.countDocuments({
    userId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
    workType: { $in: ["LEAVE", "HOLIDAY"] }
  });

  // We count unique non-working days. 
  // DayPlan HOLIDAY might overlap with Sundaya/Company Holidays, but we take it from sundays + company holidays + individual leave
  const offDays = sundaysCount + holidayCount + leaveDays;

  // 5. Check if today's plan is submitted for duty automation
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setUTCHours(23, 59, 59, 999);
  
  const todayPlan = await DayPlan.findOne({
    userId,
    date: { $gte: todayStart, $lte: todayEnd }
  });

  res.status(200).json({
    success: true,
    data: {
      clientsCovered,
      clientsTarget,
      totalDays: totalDaysCount,
      workingDays,
      offDays,
      isDayPlanSubmitted: !!todayPlan,
      userName: req.user.name,
      month: new Date(Date.UTC(2000, now.getUTCMonth())).toLocaleString('default', { month: 'long' }),
      year: now.getUTCFullYear()
    }
  });
});

/**
 * @desc Get summary list of uniquely named subordinates waiting for approvals
 * @route GET /api/dashboard/approvals-summary
 * @access Private
 */
export const getPendingApprovalsSummary = asyncHandler(async (req, res) => {
  // 1. Get subordinates for the current user
  const subordinates = await User.find({ managerId: req.user._id }).select("_id name");

  if (!subordinates || subordinates.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        tourPlans: [],
        expenses: [],
        leaves: [],
        dcrs: []
      }
    });
  }

  const subordinateIds = subordinates.map(s => s._id);

  // 2. Fetch Pending TourPlans (Grouped by User)
  const pendingTourPlans = await TourPlan.find({
    userId: { $in: subordinateIds },
    "approval.status": { $in: ["PENDING", "RESUBMITTED"] }
  }).populate("userId", "name");

  // 3. Fetch Pending Expenses (Grouped by User)
  const pendingExpenses = await Expense.find({
    userId: { $in: subordinateIds },
    "approval.status": { $in: ["PENDING", "RESUBMITTED"] }
  }).populate("userId", "name");

  // 4. Fetch Pending DCRs (Grouped by User)
  const pendingDcrs = await ActivityLog.find({
    userId: { $in: subordinateIds },
    action: "DCR",
    "approval.status": "PENDING"
  }).populate("userId", "name");

  // 5. Fetch Pending Leaves (Grouped by User)
  const pendingLeaves = await Leave.find({
    userId: { $in: subordinateIds },
    status: "PENDING"
  }).populate("userId", "name");

  // Helper to extract unique names
  const extractUniqueNames = (docs) => {
    const names = docs
      .map(doc => doc.userId?.name)
      .filter(name => Boolean(name)); // Remove falsy values if populated doc is broken
    return [...new Set(names)]; // Return unique array
  };

  res.status(200).json({
    success: true,
    data: {
      tourPlans: extractUniqueNames(pendingTourPlans),
      expenses: extractUniqueNames(pendingExpenses),
      leaves: extractUniqueNames(pendingLeaves),
      dcrs: extractUniqueNames(pendingDcrs)
    }
  });
});
