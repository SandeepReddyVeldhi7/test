import asyncHandler from "../../utils/asyncHandler.js";
import mongoose from "mongoose";
import { User, ActivityLog, UserLocation, Notification, DCR, Client, MonthlyTarget, MonthlyAchievement, Expense, TourPlan } from "../../models/index.js";
import ExcelJS from "exceljs";

/**
 * @desc  Admin Dashboard stats with date filtering
 * @route GET /api/admin/dashboard
 * @access Private (Super Admin / HR)
 */
export const getAdminDashboardStats = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { startDate, endDate, managerId: filterManagerId } = req.query;

  // Default to Today if no dates provided
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const rangeStart = startDate ? new Date(startDate) : todayStart;
  const rangeEnd = endDate ? new Date(endDate) : todayEnd;

  const startYear = rangeStart.getFullYear();
  const startMonth = rangeStart.getMonth();
  const endYear = rangeEnd.getFullYear();
  const endMonth = rangeEnd.getMonth();
  const currentMonthNum = endMonth + 1;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Get list of unique manager IDs within this company
  const managerIds = await User.distinct("managerId", { companyId, managerId: { $ne: null } });

  // Build dynamic team filter if managerId provided
  let teamFilter = { companyId: new mongoose.Types.ObjectId(companyId) };
  let activityTeamFilter = { companyId: new mongoose.Types.ObjectId(companyId) };
  let clientTeamFilter = { companyId: new mongoose.Types.ObjectId(companyId) };

  if (filterManagerId) {
    const manager = await User.findOne({ 
      $or: [{ employeeId: filterManagerId }, { _id: mongoose.isValidObjectId(filterManagerId) ? filterManagerId : null }], 
      companyId 
    });
    
    if (manager) {
      const teamIds = await User.find({ 
        $or: [{ _id: manager._id }, { managerId: manager._id }] 
      }).distinct("_id");
      
      teamFilter._id = { $in: teamIds };
      activityTeamFilter.userId = { $in: teamIds };
      clientTeamFilter.employeeId = { $in: teamIds };
    }
  }

  const [
    totalEmployeesCount,
    activeTodayCount,
    rangeCalls,
    rangeClients,
    targetData,
    achievementData,
    expenseData,
    unreadNotifications,
    topPerformersData,
    salesTrendData,
    teamPerformanceData,
    expenseDistributionData,
    activityMetricsData,
    callTrendData,
    tourPlanData,
    listedTotal,
    listedActive,
    unlistedTotal,
    unlistedActive
  ] = await Promise.all([
    User.countDocuments(teamFilter),
    User.countDocuments({ ...teamFilter, isOnline: true }),
    ActivityLog.countDocuments({
      ...activityTeamFilter,
      action: "DCR",
      timestamp: { $gte: rangeStart, $lte: rangeEnd }
    }),
    Client.countDocuments({ ...clientTeamFilter, createdAt: { $gte: rangeStart, $lte: rangeEnd } }),

    // Monthly Target (Sum)
    MonthlyTarget.aggregate([
      { $match: { ...activityTeamFilter, year: { $gte: startYear, $lte: endYear } } },
      { $unwind: "$targets" },
      { 
        $addFields: { 
          targetMonth: { $toUpper: "$targets.month" },
          currentMonthName: { $toUpper: monthNames[endMonth] },
          currentShortMonth: { $toUpper: shortMonthNames[endMonth] }
        } 
      },
      {
        $match: {
          $or: [
            { "targetMonth": { $regex: new RegExp(`^${shortMonthNames[endMonth]}`, "i") } },
            { "targetMonth": { $regex: new RegExp(`^${monthNames[endMonth]}`, "i") } }
          ]
        }
      },
      { $group: { _id: null, total: { $sum: "$targets.target" } } }
    ]),

    // Monthly Achievement (Sum)
    MonthlyAchievement.aggregate([
      { $match: { ...activityTeamFilter, year: { $gte: startYear, $lte: endYear } } },
      { $unwind: "$achievements" },
      { 
        $addFields: { 
          achieveMonth: { $toUpper: "$achievements.month" }
        } 
      },
      {
        $match: {
          $or: [
            { "achieveMonth": { $regex: new RegExp(`^${shortMonthNames[endMonth]}`, "i") } },
            { "achieveMonth": { $regex: new RegExp(`^${monthNames[endMonth]}`, "i") } }
          ]
        }
      },
      { $group: { _id: null, total: { $sum: "$achievements.achievement" } } }
    ]),

    // Expense (Sum)
    Expense.aggregate([
      { $match: { ...activityTeamFilter, year: { $gte: startYear, $lte: endYear } } },
      {
        $match: {
          $or: [
            { year: startYear, month: { $gte: startMonth + 1 }, $expr: { $cond: [{ $eq: [startYear, endYear] }, { $lte: ["$month", endMonth + 1] }, true] } },
            { year: endYear, month: { $lte: endMonth + 1 }, $expr: { $cond: [{ $eq: [startYear, endYear] }, false, true] } },
            { year: { $gt: startYear, $lt: endYear } }
          ]
        }
      },
      { $group: { _id: null, total: { $sum: "$totalMonthAmount" } } }
    ]),

    Notification.countDocuments({
      companyId,
      recipientId: req.user._id,
      isRead: false
    }),

    // Top Performers Logic (Sales + Calls)
    ActivityLog.aggregate([
      { $match: { companyId, action: "DCR", timestamp: { $gte: rangeStart, $lte: rangeEnd } } },
      { $group: { _id: "$userId", calls: { $sum: 1 } } },
      { $sort: { calls: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      {
        $lookup: {
          from: "monthlyachievements",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$userId", "$$userId"] }, { $eq: ["$year", endYear] }] } } },
            { $unwind: "$achievements" },
            { $match: { "achievements.month": monthNames[endMonth] } }
          ],
          as: "achievementDetails"
        }
      },
      {
        $project: {
          _id: 1,
          name: "$userDetails.name",
          calls: 1,
          sales: { $ifNull: [{ $arrayElemAt: ["$achievementDetails.achievements.achievement", 0] }, 0] }
        }
      },
      { $sort: { sales: -1, calls: -1 } },
      { $limit: 5 }
    ]),

    // Sales Trend Logic (Last 6 months)
    MonthlyAchievement.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId), year: endYear } },
      { $unwind: "$achievements" },
      { $group: { _id: "$achievements.month", sales: { $sum: "$achievements.achievement" } } },
      { $project: { month: "$_id", sales: 1, _id: 0 } }
    ]),

    // Team Performance (Actual Managers Only)
    User.find({ _id: { $in: managerIds } })
      .populate("roleId", "name")
      .select("name employeeId roleId lastActiveAt"),

    // Expense Distribution (by workType)
    Expense.aggregate([
      { $match: { companyId, year: endYear, month: currentMonthNum } },
      { $unwind: "$days" },
      { $group: { _id: "$days.workType", value: { $sum: "$days.totalAmount" } } },
      { $project: { label: "$_id", value: 1, _id: 0 } }
    ]),

    // 🗺️ Geography Metrics (Aggregate Stations from DCR/Activity)
    ActivityLog.aggregate([
      { $match: { ...activityTeamFilter, timestamp: { $gte: rangeStart, $lte: rangeEnd } } },
      { $group: { _id: { $toUpper: "$area" }, count: { $sum: 1 } } },
      { $project: { label: "$_id", value: "$count", _id: 0 } }
    ]),

    // 📈 Company-Wide Call Trend (Monthly for current year)
    ActivityLog.aggregate([
      { 
        $match: { 
          companyId: new mongoose.Types.ObjectId(companyId), 
          timestamp: { 
            $gte: new Date(new Date().getFullYear(), 0, 1), 
            $lte: new Date(new Date().getFullYear(), 11, 31, 23, 59, 59) 
          } 
        } 
      },
      { 
        $group: { 
          _id: { $month: "$timestamp" }, 
          value: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]),

    // 🗺️ Tour Plan Geography Metrics (Aggregate Planned Areas)
    TourPlan.aggregate([
      { $match: { ...activityTeamFilter, year: startYear } },
      { $unwind: "$plans" },
      { $match: { "plans.date": { $gte: rangeStart, $lte: rangeEnd } } },
      { $group: { _id: { $toUpper: "$plans.area" }, count: { $sum: 1 } } },
      { $project: { label: "$_id", value: "$count", _id: 0 } }
    ]),

    Client.countDocuments({ ...clientTeamFilter, priority: "L" }),
    Client.countDocuments({ ...clientTeamFilter, priority: "L", status: "active" }),
    Client.countDocuments({ ...clientTeamFilter, priority: "UL" }),
    Client.countDocuments({ ...clientTeamFilter, priority: "UL", status: "active" })
  ]);

  const tourPlanMetrics = tourPlanData || [];

  // Map to 12 months for chart consistency
  const callTrend = Array(12).fill(0).map((_, i) => ({ month: monthNames[i].toUpperCase(), value: 0 }));
  callTrendData?.forEach((t) => {
    if (t._id >= 1 && t._id <= 12) {
      callTrend[t._id - 1].value = t.value;
    }
  });

  // 🗺️ Simplified Geography Stats (Top 5 Actual Stations from Activity Logs)
  const geographyStats = (activityMetricsData || [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item, idx) => ({
      name: item.label || "Unknown",
      value: item.value,
      color: ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6'][idx % 5]
    }));

  const stats = {
    totalEmployees: totalEmployeesCount,
    activeToday: activeTodayCount,
    totalCalls: rangeCalls,
    clientsAdded: rangeClients,
    monthlyTarget: targetData[0]?.total || 0,
    monthlyAchievement: achievementData[0]?.total || 0,
    monthlyExpense: expenseData[0]?.total || 0,
    achievementPercentage: (targetData[0]?.total || 0) > 0
      ? ((achievementData[0]?.total || 0) / targetData[0]?.total) * 100
      : 0,
    unreadNotifications,
    topPerformers: topPerformersData,
    salesTrend: salesTrendData,
    callTrend: callTrend,
    geographyStats: geographyStats,
    deploymentStats: {
      listed: {
        total: listedTotal,
        active: listedActive,
      },
      unlisted: {
        total: unlistedTotal,
        active: unlistedActive
      },
      leaves: totalEmployeesCount * 2, // Aggregated leaves placeholder
      maxLeaves: totalEmployeesCount * 4
    },
    teamPerformance: teamPerformanceData.map(u => ({
      id: u.employeeId,
      name: u.name,
      role: u.roleId?.name || "Manager",
      status: u.lastActiveAt > new Date(Date.now() - 30 * 60 * 1000) ? "Active" : "Away"
    })),
    expenseDistribution: expenseDistributionData,
    activityMetrics: activityMetricsData.map(item => {
      const daysInRange = Math.max(Math.ceil((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)), 1);
      const denominator = totalEmployeesCount * daysInRange || 1;
      const utilization = (item.value / denominator) * 100;
      
      return {
        label: item.label,
        value: item.value,
        utilization: Math.min(utilization, 100).toFixed(1)
      };
    })
  };

  res.status(200).json({
    success: true,
    data: stats
  });
});



/**
 * @desc  Export Dashboard Data to Excel
 * @route GET /api/admin/dashboard/export
 * @access Private (Admin)
 */
export const exportDashboardData = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Dashboard Stats");

  worksheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 20 }
  ];

  // We reuse part of the stats logic for the export
  const [totalEmployees, activeUsers, totalCalls] = await Promise.all([
    User.countDocuments({ companyId }),
    User.countDocuments({ companyId, isOnline: true }),
    ActivityLog.countDocuments({ companyId, action: "DCR" })
  ]);

  worksheet.addRows([
    { metric: "Total Employees", value: totalEmployees },
    { metric: "Active Today", value: activeUsers },
    { metric: "Total Calls", value: totalCalls }
  ]);

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=dashboard-report.xlsx");

  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc  Get all users' latest locations for the admin map view
 * @route GET /api/admin/users-map
 * @access Private (Super Admin / HR)
 */
export const getUsersMapData = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const users = await User.find({ companyId, isActive: true, isVerified: true })
    .select("_id name employeeId roleId isOnline lastLocation lastActiveAt managerId")
    .populate("roleId", "name level")
    .populate("managerId", "name");

  const result = users.map(u => {
    let status = "offline";
    if (u.lastActiveAt) {
      if (u.lastActiveAt >= fiveMinutesAgo) status = "active";
      else if (u.lastActiveAt >= thirtyMinutesAgo) status = "idle";
      else status = "offline";
    }

    return {
      userId: u._id,
      name: u.name,
      employeeId: u.employeeId,
      role: u.roleId?.name || "—",
      manager: u.managerId?.name || "—",
      status,
      lastActiveAt: u.lastActiveAt,
      location: u.lastLocation || null
    };
  });

  res.status(200).json({ success: true, data: result });
});

/**
 * @desc  Get full team hierarchy tree
 * @route GET /api/admin/hierarchy
 * @access Private (Admin)
 */
export const getTeamHierarchy = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { includeInactive } = req.query;

  const query = { companyId };
  if (includeInactive !== "true") {
    query.isActive = true;
  }

  const users = await User.find(query)
    .select("_id name employeeId designation photo roleId managerId isActive")
    .populate("roleId", "name level")
    .lean();

  const userMap = {};
  users.forEach(u => {
    userMap[u._id.toString()] = {
      ...u,
      id: u._id,
      designation: u.designation || u.roleId?.name || "Employee",
      isActive: u.isActive,
      children: []
    };
  });

  const root = [];
  users.forEach(u => {
    const node = userMap[u._id.toString()];
    if (u.managerId && userMap[u.managerId.toString()]) {
      userMap[u.managerId.toString()].children.push(node);
    } else {
      root.push(node);
    }
  });

  res.status(200).json({
    success: true,
    data: root
  });
});
