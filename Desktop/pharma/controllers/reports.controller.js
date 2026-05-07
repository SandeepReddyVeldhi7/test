import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import mongoose from "mongoose";
import { User, ActivityLog, TourPlan, DayPlan, UserLocation, Expense, Client, Holiday, Territory } from "../models/index.js";
import ExcelJS from "exceljs";

const sanitizeSheetName = (name, existingNames) => {
  // Excel sheet name rules: No \ / ? * : [ ], max 31 chars, not empty
  let cleanName = (name || "User").replace(/[\\\/\?\*\:\[\]]/g, "").substring(0, 31).trim() || "User";
  let finalName = cleanName;
  let counter = 1;
  while (existingNames.has(finalName.toLowerCase())) {
    const suffix = ` (${counter})`;
    finalName = cleanName.substring(0, 31 - suffix.length) + suffix;
    counter++;
  }
  existingNames.add(finalName.toLowerCase());
  return finalName;
};

/**
 * @desc  Private Helper: Calculate all metrics for a single month
 * Shared by Review Report and Full Assessment to ensure 100% parity
 */
const calculateMonthlyStats = async (userId, companyId, month, year) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const companyObjectId = new mongoose.Types.ObjectId(companyId);

  // Standardize on IST 00:00:00 for the Business Month Start/End
  // We use UTC methods first, then shift by IST offset (-5.5h) to align with India Time
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  
  // Shift boundaries to align with India Time (IST) 00:00:00
  startOfMonth.setTime(startOfMonth.getTime() - (5.5 * 60 * 60 * 1000));
  endOfMonth.setTime(endOfMonth.getTime() - (5.5 * 60 * 60 * 1000));

  // 0. Base Day Metrics (Sundays + Holidays + Worked Days + Off Days)
  const holidays = await Holiday.find({
    companyId: companyObjectId,
    date: { $gte: startOfMonth, $lte: endOfMonth }
  });
  const holidayDateSet = new Set(holidays.map(h => new Date(h.date).getUTCDate()));

  let totalDaysCount = 0;
  let sundaysCount = 0;
  let holidayInMonthCount = 0;
  let tempDate = new Date(startOfMonth);
  while (tempDate <= endOfMonth) {
    const d = tempDate.getUTCDate();
    const isSun = tempDate.getUTCDay() === 0;
    const isHol = holidayDateSet.has(d);

    if (isSun) {
      sundaysCount++;
    } else if (isHol) {
      holidayInMonthCount++;
    } else {
      totalDaysCount++;
    }
    tempDate.setUTCDate(d + 1);
  }

  // 1. Database Counts 
  const baseFilter = {
    companyId: companyObjectId,
    $or: [{ createdBy: userObjectId }, { employeeId: userObjectId }]
  };

  console.log(`Querying Month ${month}/${year} for User ${userId}`);
  console.log(`Range: ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`);

  const [
    addedClients,
    listed,
    unlisted,
    active,
    inactive,
    visitedActivities,
    workedDays,
    leaveDays
  ] = await Promise.all([
    Client.countDocuments({ ...baseFilter, createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
    Client.countDocuments({ ...baseFilter, priority: "L" }),
    Client.countDocuments({ ...baseFilter, priority: "UL" }),
    Client.countDocuments({ ...baseFilter, status: "active" }),
    Client.countDocuments({ ...baseFilter, status: "inactive" }),
    ActivityLog.find({
      userId: userObjectId,
      companyId: companyObjectId,
      action: "DCR",
      timestamp: { $gte: startOfMonth, $lte: endOfMonth }
    }),
    DayPlan.countDocuments({
        userId: userObjectId,
        companyId: companyObjectId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
        workType: { $in: ["FIELD", "MEETING", "CRM", "JOINT_WORK"] }
    }),
    DayPlan.countDocuments({
        userId: userObjectId,
        companyId: companyObjectId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
        workType: { $in: ["LEAVE", "HOLIDAY"] }
    })
  ]);

  console.log(`Result for ${month}/${year}: Added=${addedClients}, Active=${active}`);

  const offDaysCount = sundaysCount + holidayInMonthCount + leaveDays;

  // 2. Journey Metrics (Planned from TourPlan)
  const tourPlan = await TourPlan.findOne({
    userId: userObjectId,
    companyId: companyObjectId,
    month,
    year
  });

  let callsPlanned = 0;
  let localCallsPlanned = 0;
  let osCallsPlanned = 0;
  let jointCallsPlanned = 0;
  let jointWorkingDays = 0;

  const jointDayDates = new Set();
  const localDayDates = new Set();
  const osDayDates = new Set();

  if (tourPlan && tourPlan.plans) {
    tourPlan.plans.forEach(p => {
      const clientCount = (p.clients?.length || 0);
      callsPlanned += clientCount;
      const d = new Date(p.date).setHours(0, 0, 0, 0);

      if (p.workType === "JOINT_WORK" || (p.jointWorkers && p.jointWorkers.length > 0)) {
        jointWorkingDays++;
        jointCallsPlanned += clientCount;
        jointDayDates.add(d);
      } else if (p.workType === "OUT_OF_STATION" || (p.area && p.area.toUpperCase() === "OUT STATION")) {
        osCallsPlanned += clientCount;
        osDayDates.add(d);
      } else if (p.workType === "FIELD") {
        localCallsPlanned += clientCount;
        localDayDates.add(d);
      }
    });
  }

  // 3. Performance Metrics
  const visitedClientIds = new Set(visitedActivities.map(l => l.clientId?.toString()).filter(id => !!id));
  const callsVisited = visitedClientIds.size;

  const localCallsVisitedSet = new Set();
  const osCallsVisitedSet = new Set();
  const jointCallsVisitedSet = new Set();

  visitedActivities.forEach(v => {
    const d = new Date(v.timestamp).setHours(0, 0, 0, 0);
    const clientId = v.clientId?.toString();
    if(!clientId) return;

    if (jointDayDates.has(d)) {
      jointCallsVisitedSet.add(clientId);
    } else if (osDayDates.has(d)) {
      osCallsVisitedSet.add(clientId);
    } else if (localDayDates.has(d)) {
      localCallsVisitedSet.add(clientId);
    }
  });

  const localCallsVisited = localCallsVisitedSet.size;
  const osCallsVisited = osCallsVisitedSet.size;
  const jointCallsVisited = jointCallsVisitedSet.size;

  let callAverageNum = 0;
  if (callsPlanned > 0) {
    callAverageNum = Math.round((callsVisited / callsPlanned) * 100);
  } else if (callsVisited > 0) {
    callAverageNum = 100;
  }

  let osCallAverageNum = 0;
  if (osCallsPlanned > 0) {
    osCallAverageNum = Math.round((osCallsVisited / osCallsPlanned) * 100);
  } else if (osCallsVisited > 0) {
    osCallAverageNum = 100;
  }

  return {
    totalDays: totalDaysCount,
    workedDays,
    offDays: offDaysCount,
    addedClients,
    listed,
    unlisted,
    active,
    inactive,
    callsPlanned,
    callsVisited,
    callAverage: `${callAverageNum}%`,
    localCallsPlanned,
    localCallsVisited,
    osCallsPlanned,
    osCallsWorked: osCallsVisited, // Unique OS clients visited
    osCallsVisited,
    osCallAverage: `${osCallAverageNum}%`,
    jointWorkingDays,
    jointCallsPlanned,
    jointCallsVisited,
    jointCallsMet: jointCallsVisited, // Added for parity
  };
};


/**
 * @desc  Get activity report for one or all users
 * @route GET /api/reports/activity?userId=&from=&to=&page=&limit=
 */
export const getActivityReport = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userId, from, to, page = 1, limit = 50 } = req.query;

  const filter = { companyId };
  if (userId) filter.userId = userId;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("userId", "name employeeId")
      .populate("clientId", "name"),
    ActivityLog.countDocuments(filter)
  ]);

  res.json({ success: true, data: { logs, total, page: Number(page), limit: Number(limit) } });
});

/**
 * @desc  Get plans report
 * @route GET /api/reports/plans?userId=&type=tour|day&from=&to=
 */
export const getPlansReport = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userId, type = "tour", from, to } = req.query;

  if (type === "tour") {
    const filter = { companyId };
    if (userId) filter.userId = userId;

    const plans = await TourPlan.find(filter)
      .sort({ year: -1, month: -1 })
      .populate("userId", "name employeeId")
      .populate("plans.clients", "name")
      .limit(200);

    return res.json({ success: true, data: plans });
  }

  // Day plans
  const filter = { companyId };
  if (userId) filter.userId = userId;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const dayPlans = await DayPlan.find(filter)
    .sort({ date: -1 })
    .populate("userId", "name employeeId")
    .limit(500);

  res.json({ success: true, data: dayPlans });
});

/**
 * Internal: build and send Excel file
 */
async function buildAndSendExcel(res, rows, fileName, columns) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");

  sheet.columns = columns;

  // Header styling
  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6366F1" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  rows.forEach(row => sheet.addRow(row));

  // Auto width
  sheet.columns.forEach(col => {
    let maxLength = col.header?.length || 10;
    col.eachCell({ includeEmpty: false }, cell => {
      const cellLength = cell.value ? String(cell.value).length : 0;
      if (cellLength > maxLength) maxLength = cellLength;
    });
    col.width = Math.min(maxLength + 4, 40);
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  await workbook.xlsx.write(res);
  res.end();
}

/**
 * @desc  Export single user activity to Excel
 * @route GET /api/reports/export/user/:id?from=&to=
 */
export const exportUserReport = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { id } = req.params;
  const { from, to } = req.query;

  const user = await User.findById(id).populate("roleId", "name");

  const filter = { companyId, userId: id };
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  const logs = await ActivityLog.find(filter)
    .sort({ timestamp: -1 })
    .populate("clientId", "name");

  const rows = logs.map(l => ({
    name: user?.name || "—",
    employeeId: user?.employeeId || "—",
    role: user?.roleId?.name || "—",
    action: l.action,
    client: l.clientId?.name || "—",
    area: l.area || "—",
    lat: l.location?.latitude || "—",
    lng: l.location?.longitude || "—",
    timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"
  }));

  await buildAndSendExcel(res, rows, `${user?.name || "user"}_report.xlsx`, [
    { header: "Name", key: "name" },
    { header: "Employee ID", key: "employeeId" },
    { header: "Role", key: "role" },
    { header: "Action", key: "action" },
    { header: "Client", key: "client" },
    { header: "Area", key: "area" },
    { header: "Latitude", key: "lat" },
    { header: "Longitude", key: "lng" },
    { header: "Timestamp", key: "timestamp" }
  ]);
});

/**
 * @desc  Export all users activity to Excel
 * @route GET /api/reports/export/all?from=&to=
 */
export const exportAllUsersReport = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { from, to } = req.query;

  const filter = { companyId };
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  const logs = await ActivityLog.find(filter)
    .sort({ timestamp: -1 })
    .populate("userId", "name employeeId roleId")
    .populate("clientId", "name")
    .limit(10000);

  const rows = logs.map(l => ({
    name: l.userId?.name || "—",
    employeeId: l.userId?.employeeId || "—",
    action: l.action,
    client: l.clientId?.name || "—",
    area: l.area || "—",
    lat: l.location?.latitude || "—",
    lng: l.location?.longitude || "—",
    timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"
  }));

  await buildAndSendExcel(res, rows, "all_users_report.xlsx", [
    { header: "Name", key: "name" },
    { header: "Employee ID", key: "employeeId" },
    { header: "Action", key: "action" },
    { header: "Client", key: "client" },
    { header: "Area", key: "area" },
    { header: "Latitude", key: "lat" },
    { header: "Longitude", key: "lng" },
    { header: "Timestamp", key: "timestamp" }
  ]);
});

/**
 * @desc  Get day report (planned vs visited calls) for multiple users
 * @route GET /api/reports/day-report?userIds=&date=
 */
export const getDayReport = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userIds, date, from, to } = req.query;

  if (!userIds || (!date && (!from || !to))) {
    throw new ApiError(400, "User IDs and Date (or range) are required");
  }

  const idArray = userIds.split(",");
  const targetDate = new Date(date || from);
  let startOfDay, endOfDay;

  if (from && to) {
    startOfDay = new Date(from);
    endOfDay = new Date(to);
  } else {
    startOfDay = new Date(new Date(targetDate).setHours(0, 0, 0, 0));
    endOfDay = new Date(new Date(targetDate).setHours(23, 59, 59, 999));
  }

  const month = targetDate.getMonth() + 1;
  const year = targetDate.getFullYear();

  const results = await Promise.all(idArray.map(async (uid) => {
    try {
      const user = await User.findById(uid).populate("roleId", "name");
      if (!user) return null;

      // 1. Get Planned Calls from TourPlan
      const tourPlan = await TourPlan.findOne({
        userId: uid,
        companyId,
        month,
        year
      }).populate({
        path: "plans.territoryId",
        select: "area"
      });

      let plannedCount = 0;
      let dynamicHQ = user.area || "N/A";
      if (tourPlan && tourPlan.plans) {
        const dayPlan = tourPlan.plans.find(p => {
          const pDate = new Date(p.date);
          return pDate.getFullYear() === year &&
            pDate.getMonth() === targetDate.getMonth() &&
            pDate.getDate() === targetDate.getDate();
        });
        if (dayPlan) {
          if (dayPlan.clients) plannedCount = dayPlan.clients.length;
          // Dynamically fetch HQ from the plan's territory/station
          dynamicHQ = dayPlan.territoryId?.area || dayPlan.area || user.area || "N/A";
        }
      }

      // 2. Get Visited Calls from ActivityLog
      const visitedLogs = await ActivityLog.find({
        userId: new mongoose.Types.ObjectId(uid),
        companyId: new mongoose.Types.ObjectId(companyId),
        action: "DCR",
        timestamp: { $gte: startOfDay, $lte: endOfDay }
      }).distinct("clientId");

      const visitedCount = visitedLogs.length;

      // 3. Calculate Call Average
      let callAverage = 0;
      if (plannedCount > 0) {
        callAverage = Math.round((visitedCount / plannedCount) * 100);
      } else if (visitedCount > 0) {
        callAverage = 100;
      }

      return {
        user: {
          id: user._id,
          name: user.name,
          role: user.roleId?.name || "Member",
          hq: dynamicHQ
        },
        plannedCount,
        visitedCount,
        callAverage
      };
    } catch (err) {
      console.error(`Error fetching day report for user ${uid}:`, err);
      return null;
    }
  }));

  res.json({
    success: true,
    data: results.filter(r => r !== null)
  });
});

/**
 * @desc  Get day map data (chronological activity logs with coordinates)
 * @route GET /api/reports/day-map?userId=&date=
 */
export const getDayMapData = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userIds, date, from, to } = req.query;

  if (!userIds || (!date && (!from || !to))) {
    throw new ApiError(400, "User IDs and Date (or range) are required");
  }

  let startOfDay, endOfDay;
  if (from && to) {
    startOfDay = new Date(from);
    endOfDay = new Date(to);
  } else {
    const targetDate = new Date(date);
    startOfDay = new Date(new Date(targetDate).setHours(0, 0, 0, 0));
    endOfDay = new Date(new Date(targetDate).setHours(23, 59, 59, 999));
  }

  const idArray = userIds.split(",").map(id => new mongoose.Types.ObjectId(id));

  const activities = await ActivityLog.find({
    userId: { $in: idArray },
    companyId: new mongoose.Types.ObjectId(companyId),
    timestamp: { $gte: startOfDay, $lte: endOfDay }
  })
    .populate("userId", "name roleId photo")
    .populate("clientId", "name address")
    .sort({ timestamp: 1 });

  console.log("Activities Found in Map:", activities.length);

  res.json({
    success: true,
    data: activities
  });
});

/**
 * @desc  Export user expenses to stylized Professional Excel
 * @route GET /api/reports/export/expenses?userId=&month=&year=
 */
export const exportExpenses = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userId, userIds, month, year } = req.query;

  const idArray = (userIds || userId || "").split(",").filter(id => id.trim());
  if (idArray.length === 0) throw new ApiError(400, "User ID(s) required");

  const m = Number(month);
  const y = Number(year);
  const startOfMonth = new Date(y, m - 1, 1);
  const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);

  const workbook = new ExcelJS.Workbook();
  const existingSheetNames = new Set();

  for (const uid of idArray) {
    const [user, expenses, dayPlans, territory] = await Promise.all([
      User.findById(uid).populate("roleId", "name"),
      Expense.find({
        companyId,
        userId: new mongoose.Types.ObjectId(uid),
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }).sort({ date: 1 }),
      DayPlan.find({
        companyId,
        userId: new mongoose.Types.ObjectId(uid),
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      Territory.findOne({ employeeId: uid })
    ]);

    if (!user) continue;

    const sheetName = sanitizeSheetName(user.name, existingSheetNames);
    const sheet = workbook.addWorksheet(sheetName);

    const GREEN_HEADER = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
    const LIGHT_GREEN = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    const DARK_GREEN = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
    const RED_LEAVE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
    const BORDER_STYLE = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    sheet.mergeCells("A1:F1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "EXPENSES";
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = GREEN_HEADER;
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    const infoData = [
      ["Name", user.name],
      ["Emp Code", user.employeeId || "—"],
      ["Designation", user.designation || user.roleId?.name || "—"],
      ["Area", territory?.area || user.area || "—"]
    ];

    infoData.forEach((item, idx) => {
      const rowIdx = idx + 2;
      sheet.getCell(`A${rowIdx}`).value = item[0];
      sheet.getCell(`A${rowIdx}`).font = { bold: true };
      sheet.getCell(`A${rowIdx}`).border = BORDER_STYLE;
      sheet.mergeCells(`B${rowIdx}:C${rowIdx}`);
      sheet.getCell(`B${rowIdx}`).value = item[1];
      sheet.getCell(`B${rowIdx}`).border = BORDER_STYLE;
    });

    let currentTableStart = 7;
    const tableHeaders = ["Date", "Station", "If, Outstation", "Outstation Name", "Amount", "Approved By"];
    sheet.getRow(currentTableStart).values = tableHeaders;
    sheet.getRow(currentTableStart).eachCell(cell => {
      cell.font = { bold: true };
      cell.border = BORDER_STYLE;
      cell.alignment = { horizontal: 'center' };
    });

    const numDays = new Date(y, m, 0).getDate();
    const expenseMap = new Map(expenses.map(e => [new Date(e.date).getDate(), e]));
    const dayPlanMap = new Map(dayPlans.map(d => [new Date(d.date).getDate(), d.workType]));

    for (let d = 1; d <= numDays; d++) {
      const dateObj = new Date(y, m - 1, d);
      const dateStr = `${d.toString().padStart(2, '0')}-${dateObj.toLocaleString('default', { month: 'short' })}-${y.toString().slice(-2)}`;
      const exp = expenseMap.get(d);
      const dayType = dayPlanMap.get(d);
      const isSunday = dateObj.getDay() === 0;

      const row = sheet.addRow([]);
      const rowIdx = row.number;

      let station = user.area || "Hyderbad";
      let isOut = "No";
      let outName = "NA";
      let amount = 0;
      let approvedBy = "—";
      let fill = null;

      if (isSunday) {
        station = "SUNDAY";
        isOut = "0";
        outName = "0";
        amount = 0;
        fill = LIGHT_GREEN;
      } else if (dayType === "HOLIDAY") {
        station = "HOLIDAY";
        isOut = "0";
        outName = "0";
        amount = 0;
        fill = DARK_GREEN;
      } else if (dayType === "LEAVE") {
        station = "LEAVE";
        isOut = "0";
        outName = "0";
        amount = 0;
        fill = RED_LEAVE;
      } else if (exp) {
        const primaryItem = exp.expenses[0];
        station = primaryItem?.area || user.area || "Hyderbad";
        isOut = primaryItem?.isOutstation ? "Yes" : "No";
        outName = primaryItem?.remarks || "NA";
        amount = exp.totalAmount;
        approvedBy = exp.approval?.status === "APPROVED" ? "APPROVED" : exp.approval?.status;
      }

      const cellValues = [dateStr, station, isOut, outName, amount, approvedBy];
      cellValues.forEach((val, cIdx) => {
        const cell = sheet.getCell(rowIdx, cIdx + 1);
        cell.value = val;
        cell.border = BORDER_STYLE;
        cell.alignment = { horizontal: 'center' };
        if (fill) {
          cell.fill = fill;
          if (fill === RED_LEAVE || fill === DARK_GREEN) {
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          }
        }
      });
    }

    sheet.columns = [
      { width: 15 }, { width: 25 }, { width: 15 }, { width: 25 }, { width: 12 }, { width: 18 }
    ];
  }

  if (workbook.worksheets.length === 0) throw new ApiError(404, "No valid users found");

  const fileName = idArray.length > 1 ? `Team_Expenses_${m}_${y}.xlsx` : `${workbook.worksheets[0].name}_Expenses_${m}_${y}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc  Export user tour plan to stylized Professional Excel
 * @route GET /api/reports/export/tour-plan?userId=&month=&year=
 */
export const exportTourPlan = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userId, userIds, month, year } = req.query;

  const idArray = (userIds || userId || "").split(",").filter(id => id.trim());
  if (idArray.length === 0) throw new ApiError(400, "User ID(s) required");

  const m = Number(month);
  const yr = Number(year);
  const startOfMonth = new Date(yr, m - 1, 1);
  const endOfMonth = new Date(yr, m, 0, 23, 59, 59, 999);

  const workbook = new ExcelJS.Workbook();
  const existingSheetNames = new Set();

  for (const uid of idArray) {
    const [user, tourPlan, dayPlans, territory] = await Promise.all([
      User.findById(uid).populate("roleId", "name"),
      TourPlan.findOne({
        companyId,
        userId: new mongoose.Types.ObjectId(uid),
        month: m,
        year: yr
      }).populate("plans.jointWorkers", "name").populate("plans.territoryId"),
      DayPlan.find({
        companyId,
        userId: new mongoose.Types.ObjectId(uid),
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      Territory.findOne({ employeeId: uid })
    ]);

    if (!user) continue;

    const sheetName = sanitizeSheetName(user.name, existingSheetNames);
    const sheet = workbook.addWorksheet(sheetName);

    const GREEN_HEADER = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
    const LIGHT_GREEN = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    const DARK_GREEN = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
    const RED_LEAVE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
    const BORDER_STYLE = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    sheet.mergeCells("A1:F1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "Tour Plan";
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = GREEN_HEADER;
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    const infoData = [
      ["Name", user.name],
      ["Emp Code", user.employeeId || "—"],
      ["Designation", user.designation || user.roleId?.name || "—"],
      ["Area", territory?.area || user.area || "—"]
    ];

    infoData.forEach((item, idx) => {
      const rowIdx = idx + 2;
      sheet.getCell(`A${rowIdx}`).value = item[0];
      sheet.getCell(`A${rowIdx}`).font = { bold: true };
      sheet.getCell(`A${rowIdx}`).border = BORDER_STYLE;
      sheet.mergeCells(`B${rowIdx}:C${rowIdx}`);
      sheet.getCell(`B${rowIdx}`).value = item[1];
      sheet.getCell(`B${rowIdx}`).border = BORDER_STYLE;
    });

    let headerRowIdx = 7;
    const tableHeaders = ["Date", "Area", "Station", "If, Jointwork (Yes/No)", "Jointwork With", "Client No.", "Approved By"];
    sheet.getRow(headerRowIdx).values = tableHeaders;
    sheet.getRow(headerRowIdx).eachCell(cell => {
      cell.font = { bold: true };
      cell.border = BORDER_STYLE;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const numDays = new Date(yr, m, 0).getDate();
    const dayPlanMap = new Map(dayPlans.map(d => [new Date(d.date).getDate(), d.workType]));
    const tourPlansByDay = new Map();
    if (tourPlan && tourPlan.plans) {
      tourPlan.plans.forEach(p => {
        tourPlansByDay.set(new Date(p.date).getDate(), p);
      });
    }

    for (let d = 1; d <= numDays; d++) {
      const dateObj = new Date(yr, m - 1, d);
      const dateStr = `${d.toString().padStart(2, '0')}-${dateObj.toLocaleString('default', { month: 'short' })}-${yr.toString().slice(-2)}`;
      const tPlan = tourPlansByDay.get(d);
      const dayType = dayPlanMap.get(d);
      const isSunday = dateObj.getDay() === 0;

      const row = sheet.addRow([]);
      const rowIdx = row.number;

      let area = territory?.area || user.area || "Base";
      let station = user.area || "Base";
      let ifJoint = "No";
      let jointWith = "NA";
      let clientNo = tPlan?.clients?.length || 0;
      let approvedBy = tourPlan?.approval?.status || "—";
      let fill = null;

      if (isSunday) {
        area = "SUNDAY";
        station = "SUNDAY";
        ifJoint = "0";
        jointWith = "0";
        clientNo = 0;
        fill = LIGHT_GREEN;
      } else if (dayType === "HOLIDAY") {
        area = "HOLIDAY";
        station = "HOLIDAY";
        ifJoint = "0";
        jointWith = "0";
        clientNo = 0;
        fill = DARK_GREEN;
      } else if (dayType === "LEAVE") {
        area = "LEAVE";
        station = "LEAVE";
        ifJoint = "0";
        jointWith = "0";
        clientNo = 0;
        fill = RED_LEAVE;
      } else if (tPlan) {
        area = tPlan.territoryId?.area || tPlan.area || user.area || "Base";
        station = tPlan.area || user.area || "Base";
        if (tPlan.jointWorkers && tPlan.jointWorkers.length > 0) {
          ifJoint = "Yes";
          jointWith = tPlan.jointWorkers.map(w => w.name).join(", ");
        }
        approvedBy = tourPlan.approval.status === "APPROVED" ? "APPROVED" : tourPlan.approval.status;
      }

      const cellValues = [dateStr, area, station, ifJoint, jointWith, clientNo, approvedBy];
      cellValues.forEach((val, cIdx) => {
        const cell = sheet.getCell(rowIdx, cIdx + 1);
        cell.value = val;
        cell.border = BORDER_STYLE;
        cell.alignment = { horizontal: 'center' };
        if (fill) {
          cell.fill = fill;
          if (fill === RED_LEAVE || fill === DARK_GREEN) {
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          }
        }
      });
    }

    sheet.columns = [
      { width: 15 }, { width: 25 }, { width: 22 }, { width: 25 }, { width: 18 }, { width: 18 }
    ];
  }

  if (workbook.worksheets.length === 0) throw new ApiError(404, "No valid users found");

  const fileName = idArray.length > 1 ? `Team_TourPlan_${m}_${yr}.xlsx` : `${workbook.worksheets[0].name}_TourPlan_${m}_${yr}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc  Export user DCR data to stylized Professional Excel (Daily Aggregation)
 * @route GET /api/reports/export/dcr?userId=&month=&year=
 */
export const exportDCRData = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userId, userIds, month, year } = req.query;

  const idArray = (userIds || userId || "").split(",").filter(id => id.trim());
  if (idArray.length === 0) throw new ApiError(400, "User ID(s) required");

  const m = Number(month);
  const yr = Number(year);
  const startOfMonth = new Date(yr, m - 1, 1);
  const endOfMonth = new Date(yr, m, 0, 23, 59, 59, 999);

  const workbook = new ExcelJS.Workbook();
  const existingSheetNames = new Set();

  for (const uid of idArray) {
    const [user, logs, tourPlan, dayPlans, territory] = await Promise.all([
      User.findById(uid).populate("roleId", "name"),
      ActivityLog.find({
        companyId,
        userId: new mongoose.Types.ObjectId(uid),
        action: "DCR",
        timestamp: { $gte: startOfMonth, $lte: endOfMonth }
      }).sort({ timestamp: 1 }).populate("clientId", "priority status"),
      TourPlan.findOne({
        companyId,
        userId: new mongoose.Types.ObjectId(uid),
        month: m,
        year: yr
      }).populate("plans.jointWorkers", "name"),
      DayPlan.find({
        companyId,
        userId: new mongoose.Types.ObjectId(uid),
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      Territory.findOne({ employeeId: uid })
    ]);

    if (!user) continue;

    const sheetName = sanitizeSheetName(user.name, existingSheetNames);
    const sheet = workbook.addWorksheet(sheetName);

    const GREEN_HEADER = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
    const LIGHT_GREEN = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    const DARK_GREEN = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
    const RED_LEAVE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
    const BORDER_STYLE = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    sheet.mergeCells("A1:H1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "DCR DETAILS";
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = GREEN_HEADER;
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    const infoData = [
      ["Name", user.name],
      ["Emp Code", user.employeeId || "—"],
      ["Designation", user.designation || user.roleId?.name || "—"],
      ["Area", territory?.area || user.area || "—"]
    ];

    infoData.forEach((item, idx) => {
      const rowIdx = idx + 2;
      sheet.getCell(`A${rowIdx}`).value = item[0];
      sheet.getCell(`A${rowIdx}`).font = { bold: true };
      sheet.getCell(`A${rowIdx}`).border = BORDER_STYLE;
      sheet.mergeCells(`B${rowIdx}:C${rowIdx}`);
      sheet.getCell(`B${rowIdx}`).value = item[1];
      sheet.getCell(`B${rowIdx}`).border = BORDER_STYLE;
    });

    let headerRowIdx = 7;
    const tableHeaders = ["Date", "Station", "If, Jointwork", "Jointwork With", "No. of Clients Visited", "Category", "Status", "Approved By"];
    sheet.getRow(headerRowIdx).values = tableHeaders;
    sheet.getRow(headerRowIdx).eachCell(cell => {
      cell.font = { bold: true };
      cell.border = BORDER_STYLE;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const numDays = new Date(yr, m, 0).getDate();
    const logsByDay = new Map();
    logs.forEach(l => {
      const day = new Date(l.timestamp).getDate();
      if (!logsByDay.has(day)) logsByDay.set(day, []);
      logsByDay.get(day).push(l);
    });

    const tourPlansByDay = new Map();
    if (tourPlan && tourPlan.plans) {
      tourPlan.plans.forEach(p => {
        tourPlansByDay.set(new Date(p.date).getDate(), p);
      });
    }
    const dayPlanMap = new Map(dayPlans.map(d => [new Date(d.date).getDate(), d.workType]));

    for (let d = 1; d <= numDays; d++) {
      const dateObj = new Date(yr, m - 1, d);
      const dateStr = `${d.toString().padStart(2, '0')}-${dateObj.toLocaleString('default', { month: 'short' })}-${yr.toString().slice(-2)}`;
      const dailyLogs = logsByDay.get(d) || [];
      const tPlan = tourPlansByDay.get(d);
      const dayType = dayPlanMap.get(d);
      const isSunday = dateObj.getDay() === 0;

      const row = sheet.addRow([]);
      const rowIdx = row.number;

      let station = user.area || "Hyderbad";
      let ifJoint = "No";
      let jointWith = "NA";
      let clientsVisited = dailyLogs.length;
      let category = "—";
      let status = "—";
      let approvedBy = "—";
      let fill = null;

      if (isSunday) {
        station = "SUNDAY";
        ifJoint = "0";
        jointWith = "0";
        clientsVisited = 0;
        fill = LIGHT_GREEN;
      } else if (dayType === "HOLIDAY") {
        station = "HOLIDAY";
        ifJoint = "0";
        jointWith = "0";
        clientsVisited = 0;
        fill = DARK_GREEN;
      } else if (dayType === "LEAVE") {
        station = "LEAVE";
        ifJoint = "0";
        jointWith = "0";
        clientsVisited = 0;
        fill = RED_LEAVE;
      } else {
        if (tPlan && tPlan.jointWorkers && tPlan.jointWorkers.length > 0) {
          ifJoint = "Yes";
          jointWith = tPlan.jointWorkers.map(w => w.name).join(", ");
        }
        if (dailyLogs.length > 0) {
          const firstClient = dailyLogs[0].clientId;
          if (firstClient) {
            category = firstClient.priority === "L" ? "Listed" : "Unlisted";
            status = firstClient.status === "active" ? "Active" : "Inactive";
          }
          const anyApproved = dailyLogs.some(l => l.approval?.status === "APPROVED");
          approvedBy = anyApproved ? "APPROVED" : (dailyLogs[0].approval?.status || "—");
        }
      }

      const cellValues = [dateStr, station, ifJoint, jointWith, clientsVisited, category, status, approvedBy];
      cellValues.forEach((val, cIdx) => {
        const cell = sheet.getCell(rowIdx, cIdx + 1);
        cell.value = val;
        cell.border = BORDER_STYLE;
        cell.alignment = { horizontal: 'center' };
        if (fill) {
          cell.fill = fill;
          if (fill === RED_LEAVE || fill === DARK_GREEN) {
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          }
        }
      });
    }

    sheet.columns = [
      { width: 15 }, { width: 25 }, { width: 15 }, { width: 25 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 18 }
    ];
  }

  if (workbook.worksheets.length === 0) throw new ApiError(404, "No valid users found");

  const fileName = idArray.length > 1 ? `Team_DCR_${m}_${yr}.xlsx` : `${workbook.worksheets[0].name}_DCR_${m}_${yr}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc  Export user clients list to stylized Professional Excel
 * @route GET /api/reports/export/clients?userId=
 */
export const exportClients = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userId, userIds } = req.query;

  const idArray = (userIds || userId || "").split(",").filter(id => id.trim());
  if (idArray.length === 0) throw new ApiError(400, "User ID(s) required");

  const workbook = new ExcelJS.Workbook();
  const existingSheetNames = new Set();

  for (const uid of idArray) {
    const [user, clients, territory] = await Promise.all([
      User.findById(uid).populate("roleId", "name"),
      Client.find({
        companyId,
        $or: [{ createdBy: uid }, { employeeId: uid }]
      }).sort({ name: 1 }),
      Territory.findOne({ employeeId: uid })
    ]);

    if (!user) continue;

    const sheetName = sanitizeSheetName(user.name, existingSheetNames);
    const sheet = workbook.addWorksheet(sheetName);

    const GREEN_HEADER = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B050' } };
    const BORDER_STYLE = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    sheet.mergeCells("A1:L1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "Client List";
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = GREEN_HEADER;
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    const infoData = [
      ["Name", user.name],
      ["Emp Code", user.employeeId || "—"],
      ["Designation", user.designation || user.roleId?.name || "—"],
      ["Area", territory?.area || user.area || "—"]
    ];

    infoData.forEach((item, idx) => {
      const rowIdx = idx + 2;
      sheet.getCell(`A${rowIdx}`).value = item[0];
      sheet.getCell(`A${rowIdx}`).font = { bold: true };
      sheet.getCell(`A${rowIdx}`).border = BORDER_STYLE;
      sheet.mergeCells(`B${rowIdx}:C${rowIdx}`);
      sheet.getCell(`B${rowIdx}`).value = item[1];
      sheet.getCell(`B${rowIdx}`).border = BORDER_STYLE;
    });

    let headerRowIdx = 7;
    const tableHeaders = [
      "Sr.No.", "Client Name", "Client Type", "Designation",
      "Special Date", "Type of Special Day", "Area",
      "Listed", "Status", "Unlisted", "Client Interest", "Approved By"
    ];
    sheet.getRow(headerRowIdx).values = tableHeaders;
    sheet.getRow(headerRowIdx).eachCell(cell => {
      cell.font = { bold: true };
      cell.border = BORDER_STYLE;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    clients.forEach((c, index) => {
      const rowIdx = headerRowIdx + 1 + index;
      let specialDateStr = "—";
      if (c.dob) {
        const d = new Date(c.dob);
        specialDateStr = `${d.getDate().toString().padStart(2, '0')}-${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear().toString().slice(-2)}`;
      } else if (c.anniversary) {
        const d = new Date(c.anniversary);
        specialDateStr = `${d.getDate().toString().padStart(2, '0')}-${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear().toString().slice(-2)}`;
      }
      const listedStatus = c.priority === "L" ? "Yes" : "NO";
      const unlistedStatus = c.priority === "UL" ? "Yes" : "NA";
      const clientStatus = c.status === "active" ? "Active" : (c.status === "inactive" ? "Inactive" : "NA");
      const rowValues = [index + 1, c.name, c.clientType || "—", c.designation || "—", specialDateStr, c.specialDateType || "—", c.area || "—", listedStatus, clientStatus, unlistedStatus, c.clientInterest || "NA", "XXX"];
      sheet.getRow(rowIdx).values = rowValues;
      sheet.getRow(rowIdx).eachCell(cell => {
        cell.border = BORDER_STYLE;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    sheet.columns = [
      { width: 8 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 20 }, { width: 20 }, { width: 10 }, { width: 12 }, { width: 10 }, { width: 15 }, { width: 15 }
    ];
  }

  if (workbook.worksheets.length === 0) throw new ApiError(404, "No valid users found");

  const fileName = idArray.length > 1 ? "Team_Client_List.xlsx" : `${workbook.worksheets[0].name}_Client_List.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc  Get monthly review report stats for multiple users
 */
export const getReviewReport = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userIds, month, year } = req.query;

  if (!userIds || !month || !year) {
    throw new ApiError(400, "User IDs, month, and year are required");
  }

  const idArray = userIds.split(",").map(id => id.trim());
  const m = Number(month);
  const y = Number(year);

  const results = await Promise.all(idArray.map(async (uid) => {
    try {
      const user = await User.findById(uid).populate("roleId", "name");
      if (!user) return null;

      const stats = await calculateMonthlyStats(uid, companyId, m, y);

      return {
        user: {
          id: user._id,
          name: user.name,
          role: user.roleId?.name || "Member",
          employeeId: user.employeeId
        },
        stats
      };
    } catch (err) {
      return null;
    }
  }));

  res.json({
    success: true,
    data: results.filter(r => r !== null)
  });
});

/**
 * @desc  Get HR Data Report for multiple users
 */
export const getHRReport = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userIds, month, year } = req.query;

  if (!userIds || !month || !year) {
    throw new ApiError(400, "User IDs, month, and year are required");
  }

  const idArray = userIds.split(",").map(id => id.trim());
  const m = Number(month);
  const y = Number(year);

  const results = await Promise.all(idArray.map(async (uid) => {
    try {
      const user = await User.findById(uid).populate("roleId", "name");
      if (!user) return null;

      const stats = await calculateMonthlyStats(uid, companyId, m, y);
      const numDays = new Date(y, m, 0).getDate();

      return {
        user: {
          id: user._id,
          name: user.name,
          role: user.roleId?.name || "Member",
          employeeId: user.employeeId,
          hq: user.area || "N/A"
        },
        metrics: [
          { label: "Total Working Days", value: numDays.toString() },
          { label: "Holidays & Sundays", value: stats.offDays.toString() },
          { label: "FW Days", value: stats.workedDays.toString() },
          { label: "HQ", value: user.area || "N/A" },
        ]
      };
    } catch (err) {
      return null;
    }
  }));

  res.json({
    success: true,
    data: results.filter(r => r !== null)
  });
});

/**
 * @desc  Get Full Assessment report (multi-month)
 */
export const getFullAssessmentReport = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userIds, year, fromMonth, toMonth } = req.query;

  if (!userIds || !year || !fromMonth || !toMonth) {
    throw new ApiError(400, "Required fields missing");
  }

  const idArray = userIds.split(",").map(id => id.trim());
  const start = parseInt(fromMonth);
  const end = parseInt(toMonth);
  const yr = parseInt(year);

  const results = await Promise.all(idArray.map(async (uid) => {
    try {
      const user = await User.findById(uid).populate("roleId", "name");
      if (!user) return null;

      const monthlyStats = [];
      let totals = {
        totalDays: 0,
        workedDays: 0,
        offDays: 0,
        addedClients: 0,
        listed: 0,
        unlisted: 0,
        active: 0,
        inactive: 0,
        callsPlanned: 0,
        callsVisited: 0,
        localCallsPlanned: 0,
        localCallsVisited: 0,
        osCallsPlanned: 0,
        osCallsWorked: 0,
        osCallsVisited: 0,
        jointWorkingDays: 0,
        jointCallsPlanned: 0,
        jointCallsVisited: 0,
        jointCallsMet: 0,
      };

      for (let m = start; m <= end; m++) {
        const stats = await calculateMonthlyStats(uid, companyId, m, yr);
        monthlyStats.push({
          ...stats,
          month: m,
          monthName: new Date(yr, m - 1).toLocaleString('default', { month: 'long' })
        });

        totals.totalDays += stats.totalDays;
        totals.workedDays += stats.workedDays;
        totals.offDays += stats.offDays;
        totals.addedClients += stats.addedClients;
        totals.listed = stats.listed;
        totals.unlisted = stats.unlisted;
        totals.active = stats.active;
        totals.inactive = stats.inactive;
        totals.callsPlanned += stats.callsPlanned;
        totals.callsVisited += stats.callsVisited;
        totals.localCallsPlanned += stats.localCallsPlanned;
        totals.localCallsVisited += stats.localCallsVisited;
        totals.osCallsPlanned += stats.osCallsPlanned;
        totals.osCallsWorked += stats.osCallsWorked;
        totals.osCallsVisited += stats.osCallsVisited;
        totals.jointWorkingDays += stats.jointWorkingDays;
        totals.jointCallsPlanned += stats.jointCallsPlanned;
        totals.jointCallsVisited += stats.jointCallsVisited;
        totals.jointCallsMet += stats.jointCallsMet;
      }

      const callAverage = totals.callsPlanned > 0 ?
        `${Math.round((totals.callsVisited / totals.callsPlanned) * 100)}%` :
        (totals.callsVisited > 0 ? "100%" : "0%");

      const osCallAverage = totals.osCallsPlanned > 0 ?
        `${Math.round((totals.osCallsVisited / totals.osCallsPlanned) * 100)}%` :
        (totals.osCallsVisited > 0 ? "100%" : "0%");

      return {
        user: {
          id: user._id,
          name: user.name,
          role: user.roleId?.name || "Member",
          employeeId: user.employeeId
        },
        range: { fromMonth: start, toMonth: end, year: yr },
        totals: { ...totals, callAverage, osCallAverage },
        chartData: monthlyStats
      };
    } catch (err) {
      console.error("Full Assessment Error:", err);
      return null;
    }
  }));

  res.json({
    success: true,
    data: results.filter(r => r !== null)
  });
});

/**
 * @desc  Export Full Assessment to Professional Excel
 */
export const exportFullAssessmentExcel = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userId, year, fromMonth, toMonth } = req.query;

  const user = await User.findById(userId).populate("roleId", "name");
  if (!user) throw new ApiError(404, "User not found");

  const start = Number(fromMonth);
  const end = Number(toMonth);
  const yr = Number(year);

  const activityLogs = await ActivityLog.find({
    companyId,
    userId: new mongoose.Types.ObjectId(userId),
    action: "DCR",
    timestamp: {
      $gte: new Date(yr, start - 1, 1),
      $lte: new Date(yr, end, 0, 23, 59, 59)
    }
  }).sort({ timestamp: 1 }).populate("clientId", "name");

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Full Assessment");

  sheet.mergeCells("A1:G1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "FULL ASSESSMENT REPORT BY CREDENCE";
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: "center" };

  sheet.mergeCells("A2:G2");
  sheet.getCell("A2").value = "PERFORMANCE ASSESSMENT SUMMARY";
  sheet.getCell("A2").alignment = { horizontal: "center" };
  sheet.getCell("A2").fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9A8D4' } };
  const headerFont = { bold: true };

  sheet.getCell("A3").value = "Name:";
  sheet.getCell("B3").value = user.name;
  sheet.getCell("C3").value = "Designation:";
  sheet.getCell("D3").value = user.roleId?.name || "N/A";
  sheet.getCell("E3").value = "Employee ID:";
  sheet.getCell("F3").value = user.employeeId || "N/A";

  ["A3", "C3", "E3"].forEach(pos => {
    sheet.getCell(pos).fill = headerFill;
    sheet.getCell(pos).font = headerFont;
  });

  sheet.getCell("A4").value = "Period:";
  sheet.getCell("B4").value = `${new Date(yr, start - 1).toLocaleString('default', { month: 'long' })} to ${new Date(yr, end - 1).toLocaleString('default', { month: 'long' })}`;
  sheet.getCell("C4").value = "Year:";
  sheet.getCell("D4").value = yr;
  sheet.getCell("E4").value = "Exported On:";
  sheet.getCell("F4").value = new Date().toLocaleDateString();

  ["A4", "C4", "E4"].forEach(pos => {
    sheet.getCell(pos).fill = headerFill;
    sheet.getCell(pos).font = headerFont;
  });

  sheet.getRow(6).values = ["Date", "Client Name", "Area", "Time", "Status", "Activity", "Remarks"];
  sheet.getRow(6).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { horizontal: 'center' };
  });

  activityLogs.forEach((l) => {
    sheet.addRow([
      l.timestamp.toLocaleDateString(),
      l.clientId?.name || "—",
      l.area || "—",
      l.timestamp.toLocaleTimeString(),
      l.approval?.status || "Pending",
      l.action,
      l.remarks || "—"
    ]);
  });

  sheet.columns = [
    { width: 15 }, { width: 30 }, { width: 25 }, { width: 15 }, { width: 12 }, { width: 15 }, { width: 40 }
  ];

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="Full_Assessment_${user.name}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});
