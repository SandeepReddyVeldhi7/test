import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import mongoose from "mongoose";
import { User, Expense, Territory, Holiday, DayPlan, MonthlyTarget, MonthlyAchievement } from "../../models/index.js";
import Compensation from "../../models/Compensation.model.js";
import ExcelJS from "exceljs";

const sanitizeSheetName = (name, existingNames) => {
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
 * @desc  Export ALL company expenses to stylized Professional Excel (Admin View)
 */
export const exportAdminFullExpenses = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { startDate, endDate } = req.query;

  const startRange = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endRange = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

  const [users, holidays] = await Promise.all([
    User.find({ companyId }).populate("roleId", "name"),
    Holiday.find({ companyId, date: { $gte: startRange, $lte: endRange } })
  ]);
  
  const holidayMap = new Map(holidays.map(h => [new Date(h.date).toDateString(), h]));
  const workbook = new ExcelJS.Workbook();
  const existingSheetNames = new Set();

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

  for (const user of users) {
    const [expenses, dayPlans, territory] = await Promise.all([
      Expense.find({
        companyId,
        userId: user._id,
        "days.date": { $gte: startRange, $lte: endRange }
      }).sort({ updatedAt: -1 }),
      DayPlan.find({
        companyId,
        userId: user._id,
        date: { $gte: startRange, $lte: endRange }
      }),
      Territory.findOne({ employeeId: user._id })
    ]);

    if (expenses.length === 0 && dayPlans.length === 0) continue;

    const sheetName = sanitizeSheetName(user.name, existingSheetNames);
    const sheet = workbook.addWorksheet(sheetName);

    sheet.mergeCells("A1:G1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "ADMIN EXPENSE AUDIT";
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

    const headers = ["Date", "Station", "Area", "Work Type", "Description/Remarks", "Amount", "Status"];
    sheet.getRow(7).values = headers;
    sheet.getRow(7).eachCell(cell => {
      cell.font = { bold: true };
      cell.border = BORDER_STYLE;
      cell.alignment = { horizontal: 'center' };
    });

    const expenseDayMap = new Map();
    expenses.forEach(doc => {
      doc.days.forEach(day => {
        const dStr = new Date(day.date).toDateString();
        expenseDayMap.set(dStr, day);
      });
    });

    const dayPlanMap = new Map(dayPlans.map(dp => [new Date(dp.date).toDateString(), dp.workType]));

    let current = new Date(startRange);
    let totalSpent = 0;
    while (current <= endRange) {
      const dStr = current.toDateString();
      const exp = expenseDayMap.get(dStr);
      const dayType = dayPlanMap.get(dStr);
      const isSunday = current.getDay() === 0;
      const hol = holidayMap.get(dStr);

      let station = user.area || "Base";
      let area = territory?.area || user.area || "Base";
      let workType = dayType || (isSunday ? "SUNDAY" : (hol ? "HOLIDAY" : "FIELD"));
      let remarks = exp?.expenses?.[0]?.remarks || "NA";
      let amount = exp?.totalAmount || 0;
      let status = exp?.status || "—";
      let fill = null;

      totalSpent += amount;

      if (isSunday) {
        station = "SUNDAY";
        fill = LIGHT_GREEN;
      } else if (hol || dayType === "HOLIDAY") {
        station = hol?.name || "HOLIDAY";
        fill = DARK_GREEN;
      } else if (dayType === "LEAVE") {
        station = "LEAVE";
        fill = RED_LEAVE;
      } else if (exp) {
        station = exp.expenses?.[0]?.area || user.area || "Base";
        workType = exp.workType;
      }

      const row = sheet.addRow([
        current.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }),
        station,
        area,
        workType,
        remarks,
        amount,
        status
      ]);

      row.eachCell(cell => {
        cell.border = BORDER_STYLE;
        cell.alignment = { horizontal: 'center' };
        if (fill) {
          cell.fill = fill;
          if (fill === RED_LEAVE || fill === DARK_GREEN) {
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
          }
        }
      });

      current.setDate(current.getDate() + 1);
    }

    // Append Total Row
    const totalRow = sheet.addRow(["", "", "", "", "GRAND TOTAL AMOUNT", totalSpent, ""]);
    totalRow.eachCell((cell, colNumber) => {
      if (colNumber === 5 || colNumber === 6) {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      }
      cell.border = BORDER_STYLE;
    });

    sheet.columns = [
      { width: 15 }, { width: 25 }, { width: 25 }, { width: 15 }, { width: 30 }, { width: 12 }, { width: 18 }
    ];
  }

  if (workbook.worksheets.length === 0) {
    throw new ApiError(404, "No data available for export in this period.");
  }

  const fileName = `Admin_Audit_Full_${new Date().getTime()}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc  Export All Users Expense Summary (Monthly)
 * @route GET /api/admin-reports/export-expense-summary?month=&year=
 */
export const exportAllUsersExpenseSummary = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { month, year } = req.query;
  const m = Number(month);
  const y = Number(year);

  const users = await User.find({ companyId, status: "active" }).populate("roleId", "name");
  const expenses = await Expense.find({ companyId, month: m, year: y });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Expense Summary");

  sheet.mergeCells("A1:C1");
  const title = sheet.getCell("A1");
  title.value = `ORGANIZATIONAL EXPENSE SUMMARY - ${m}/${y}`;
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: "center" };

  const headers = ["User Name", "Designation", "Total Expense"];
  sheet.getRow(3).values = headers;
  sheet.getRow(3).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
    cell.alignment = { horizontal: 'center' };
  });

  let grandTotal = 0;
  users.forEach(u => {
    const userExp = expenses.find(e => e.userId.toString() === u._id.toString());
    const amount = userExp ? userExp.totalAmount : 0;
    grandTotal += amount;
    sheet.addRow([u.name, u.roleId?.name || "Member", amount]);
  });

  const totalRow = sheet.addRow(["GRAND TOTAL", "", grandTotal]);
  totalRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  });

  sheet.columns = [{ width: 35 }, { width: 25 }, { width: 20 }];
  
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="Expense_Summary_${m}_${y}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc  Export All Users Compensation Summary (Monthly)
 * @route GET /api/admin-reports/export-compensation-summary?month=&year=
 */
export const exportAllUsersCompensationSummary = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { month, year } = req.query;

  const users = await User.find({ companyId, status: "active" }).populate("roleId", "name");
  const compensations = await Compensation.find({ companyId });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Compensation Summary");

  sheet.mergeCells("A1:C1");
  const title = sheet.getCell("A1");
  title.value = `ORGANIZATIONAL COMPENSATION SUMMARY - ${month}/${year}`;
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: "center" };

  const headers = ["User Name", "Designation", "Total Compensation"];
  sheet.getRow(3).values = headers;
  sheet.getRow(3).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };
    cell.alignment = { horizontal: 'center' };
  });

  let grandTotal = 0;
  users.forEach(u => {
    const comp = compensations.find(c => c.userId.toString() === u._id.toString());
    const amount = comp?.current?.totalAmount || 0;
    grandTotal += amount;
    sheet.addRow([u.name, u.roleId?.name || "Member", amount]);
  });

  const totalRow = sheet.addRow(["GRAND TOTAL", "", grandTotal]);
  totalRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  });

  sheet.columns = [{ width: 35 }, { width: 25 }, { width: 20 }];

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="Compensation_Summary_${month}_${year}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc  Export Single User Audit (Multi-Month Support)
 */
export const exportAdminUserExpenses = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userId, startDate, endDate } = req.query;

  if (!userId || userId === 'undefined' || userId === 'null') {
    throw new ApiError(400, "Valid User ID required");
  }

  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date();
  
  const monthList = [];
  let currentMonthNode = new Date(start.getFullYear(), start.getMonth(), 1);
  while (currentMonthNode <= end) {
    monthList.push({ m: currentMonthNode.getMonth() + 1, y: currentMonthNode.getFullYear() });
    currentMonthNode.setMonth(currentMonthNode.getMonth() + 1);
  }

  const [user, territory, expenses, dayPlans, holidays] = await Promise.all([
    User.findById(userId).populate("roleId", "name"),
    Territory.findOne({ employeeId: userId }),
    Expense.find({
      companyId,
      userId: new mongoose.Types.ObjectId(userId),
      $or: monthList.map(item => ({ month: item.m, year: item.y }))
    }).sort({ year: 1, month: 1 }),
    DayPlan.find({
      companyId,
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: start, $lte: end }
    }),
    Holiday.find({ companyId, date: { $gte: start, $lte: end } })
  ]);

  const holidayMap = new Map(holidays.map(h => [new Date(h.date).toDateString(), h]));

  if (!user) throw new ApiError(404, "User not found");

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sanitizeSheetName(user.name, new Set()));

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

  sheet.mergeCells("A1:G1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "MEMBER PERFORMANCE AUDIT";
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

  const headers = ["Date", "Station", "Area", "Work Type", "Description/Remarks", "Amount", "Status"];
  sheet.getRow(7).values = headers;
  sheet.getRow(7).eachCell(cell => {
    cell.font = { bold: true };
    cell.border = BORDER_STYLE;
    cell.alignment = { horizontal: 'center' };
  });

  const expenseDayMap = new Map();
  expenses.forEach(doc => {
    doc.days.forEach(day => {
      const dStr = new Date(day.date).toDateString();
      expenseDayMap.set(dStr, day);
    });
  });

  const dayPlanMap = new Map(dayPlans.map(dp => [new Date(dp.date).toDateString(), dp.workType]));

  let iter = new Date(start);
  let totalAmount = 0;
  while (iter <= end) {
    const dStr = iter.toDateString();
    const exp = expenseDayMap.get(dStr);
    const dayType = dayPlanMap.get(dStr);
    const isSunday = iter.getDay() === 0;
    const hol = holidayMap.get(dStr);

    let station = user.area || "Base";
    let area = territory?.area || user.area || "Base";
    let workType = dayType || (isSunday ? "SUNDAY" : (hol ? "HOLIDAY" : "FIELD"));
    let remarks = exp?.expenses?.[0]?.remarks || "NA";
    let amount = exp?.totalAmount || 0;
    let status = exp?.status || "—";
    let fill = null;

    totalAmount += amount;

    if (isSunday) {
      station = "SUNDAY";
      fill = LIGHT_GREEN;
    } else if (hol || dayType === "HOLIDAY") {
      station = hol?.name || "HOLIDAY";
      fill = DARK_GREEN;
    } else if (dayType === "LEAVE") {
      station = "LEAVE";
      fill = RED_LEAVE;
    } else if (exp) {
      station = exp.expenses?.[0]?.area || user.area || "Base";
      workType = exp.workType;
    }

    const row = sheet.addRow([
      iter.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }),
      station,
      area,
      workType,
      remarks,
      amount,
      status
    ]);

    row.eachCell(cell => {
      cell.border = BORDER_STYLE;
      cell.alignment = { horizontal: 'center' };
      if (fill) {
        cell.fill = fill;
        if (fill === RED_LEAVE || fill === DARK_GREEN) {
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        }
      }
    });

    iter.setDate(iter.getDate() + 1);
  }

  // Append Total Row
  const totalRow = sheet.addRow(["", "", "", "", "GRAND TOTAL AMOUNT", totalAmount, ""]);
  totalRow.eachCell((cell, colNumber) => {
    if (colNumber === 5 || colNumber === 6) {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    }
    cell.border = BORDER_STYLE;
  });

  sheet.columns = [
    { width: 15 }, { width: 25 }, { width: 25 }, { width: 15 }, { width: 30 }, { width: 12 }, { width: 18 }
  ];

  const fileName = `${user.name}_Audit_${new Date().getTime()}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc  Get Member Audit Data in JSON (for dashboard popup)
 * @route GET /api/admin-reports/audit-data?userId=&startDate=&endDate=
 */
export const getAdminUserAuditData = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userId, startDate, endDate } = req.query;

  if (!userId || userId === 'undefined' || userId === 'null') {
    throw new ApiError(400, "Valid User ID required");
  }

  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(endDate) : new Date();
  
  const monthList = [];
  let currentMonthNode = new Date(start.getFullYear(), start.getMonth(), 1);
  while (currentMonthNode <= end) {
    monthList.push({ m: currentMonthNode.getMonth() + 1, y: currentMonthNode.getFullYear() });
    currentMonthNode.setMonth(currentMonthNode.getMonth() + 1);
  }

  const [user, territory, expenses, dayPlans, holidays] = await Promise.all([
    User.findById(userId).populate("roleId", "name"),
    Territory.findOne({ employeeId: userId }),
    Expense.find({
      companyId,
      userId: new mongoose.Types.ObjectId(userId),
      $or: monthList.map(item => ({ month: item.m, year: item.y }))
    }).sort({ year: 1, month: 1 }),
    DayPlan.find({
      companyId,
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: start, $lte: end }
    }),
    Holiday.find({ companyId, date: { $gte: start, $lte: end } })
  ]);

  const holidayMap = new Map(holidays.map(h => [new Date(h.date).toDateString(), h]));
  if (!user) throw new ApiError(404, "User not found");

  const expenseDayMap = new Map();
  expenses.forEach(doc => {
    doc.days.forEach(day => {
      const dStr = new Date(day.date).toDateString();
      expenseDayMap.set(dStr, day);
    });
  });

  const dayPlanMap = new Map(dayPlans.map(dp => [new Date(dp.date).toDateString(), dp.workType]));

  const calendar = [];
  let iter = new Date(start);
  let totalAmount = 0;
  
  while (iter <= end) {
    const dStr = iter.toDateString();
    const exp = expenseDayMap.get(dStr);
    const dayType = dayPlanMap.get(dStr);
    const isSunday = iter.getDay() === 0;
    const hol = holidayMap.get(dStr);

    let station = user.area || "Base";
    let area = territory?.area || user.area || "Base";
    let workType = dayType || (isSunday ? "SUNDAY" : (hol ? "HOLIDAY" : "FIELD"));
    let remarks = exp?.expenses?.[0]?.remarks || "NA";
    let amount = exp?.totalAmount || 0;
    let status = exp?.status || "—";
    
    totalAmount += amount;

    if (isSunday) {
      station = "SUNDAY";
    } else if (hol || dayType === "HOLIDAY") {
      station = hol?.name || "HOLIDAY";
    } else if (dayType === "LEAVE") {
      station = "LEAVE";
    } else if (exp) {
      station = exp.expenses?.[0]?.area || user.area || "Base";
      workType = exp.workType;
    }

    calendar.push({
      date: new Date(iter),
      station,
      area,
      workType,
      remarks,
      amount,
      status,
      isSunday,
      isHoliday: !!hol,
      isLeave: dayType === "LEAVE"
    });

    iter.setDate(iter.getDate() + 1);
  }

  res.json({
    success: true,
    data: {
      user: {
        name: user.name,
        employeeId: user.employeeId,
        designation: user.designation || user.roleId?.name,
        area: territory?.area || user.area
      },
      calendar,
      totalAmount
    }
  });
});

export const exportTeamPayroll = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;

  const payrolls = await Compensation.find({ companyId })
    .populate("userId", "name employeeId")
    .sort({ totalAmount: -1 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Team Payroll Audit");

  const BORDER_STYLE = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // Header Row
  const header = sheet.addRow([
    "S.No",
    "Employee Name",
    "Employee ID",
    "Designation",
    "Effective Date",
    "Monthly Gross CTC",
    "Status"
  ]);

  header.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = BORDER_STYLE;
  });

  payrolls.forEach((p, idx) => {
    const row = sheet.addRow([
      idx + 1,
      p.userId?.name || "NA",
      p.userId?.employeeId || "NA",
      p.current?.designation || "NA",
      p.current?.effectiveFrom || "NA",
      p.current?.totalAmount || 0,
      p.current?.isLocked ? "LOCKED" : "DRAFT"
    ]);

    row.eachCell(cell => {
      cell.border = BORDER_STYLE;
      cell.alignment = { horizontal: 'center' };
    });
  });

  // Calculate Grand Total
  const grandTotal = payrolls.reduce((acc, curr) => acc + (curr.current?.totalAmount || 0), 0);
  const totalRow = sheet.addRow(["", "", "", "", "TOTAL ORGANIZATIONAL PAYOUT", grandTotal, ""]);
  
  totalRow.eachCell((cell, colNumber) => {
    if (colNumber === 5 || colNumber === 6) {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
    }
    cell.border = BORDER_STYLE;
    cell.alignment = { horizontal: 'center' };
  });

  sheet.columns = [
    { width: 8 }, { width: 25 }, { width: 15 }, { width: 25 }, { width: 15 }, { width: 20 }, { width: 15 }
  ];

  const fileName = `Team_Payroll_Export_${new Date().getTime()}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
});

/**
 * @desc  Export Sale Achievement to Excel (Admin View)
 * @route GET /api/admin-reports/export-sales?userIds=&year=
 */
export const exportSaleAchievement = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { userIds, year } = req.query;

  if (!year) throw new ApiError(400, "Year is required");
  const idArray = (userIds || "").split(",").filter(id => id.trim());
  if (idArray.length === 0) throw new ApiError(400, "Personnel selection required");

  const y = Number(year);
  const workbook = new ExcelJS.Workbook();
  const existingSheetNames = new Set();

  const BORDER_STYLE = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHS_DB = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  for (const uid of idArray) {
    const [user, targetDoc, achievementDoc, territory] = await Promise.all([
      User.findById(uid).populate("roleId", "name"),
      MonthlyTarget.findOne({ userId: uid, companyId, year: y }),
      MonthlyAchievement.findOne({ userId: uid, companyId, year: y }),
      Territory.findOne({ employeeId: uid })
    ]);

    if (!user) continue;

    const sheetName = sanitizeSheetName(user.name, existingSheetNames);
    const sheet = workbook.addWorksheet(sheetName);

    // Header
    sheet.mergeCells("A1:G1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `SALE ACHIEVEMENT AUDIT - ${y}`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Info Table
    const infoData = [
      ["Name", user.name],
      ["Emp Code", user.employeeId || "—"],
      ["Designation", user.designation || user.roleId?.name || "—"],
      ["Area/HQ", territory?.area || user.area || "—"]
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

    // Table Headers
    const headers = ["Month", "Monthly Target", "Primary Achievement", "Primary Growth %", "Secondary Achievement", "Secondary Growth %", "Performance", "Status"];
    sheet.getRow(7).values = headers;
    sheet.getRow(7).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
      cell.border = BORDER_STYLE;
      cell.alignment = { horizontal: 'center' };
    });

    let totalTarget = 0;
    let totalPrimary = 0;
    let totalSecondary = 0;

    MONTHS.forEach((mName, index) => {
      const dbMonth = MONTHS_DB[index];
      const target = targetDoc?.targets?.find(t => t.month === dbMonth)?.target || 0;
      const achievement = achievementDoc?.achievements?.find(a => a.month === dbMonth);
      const primary = achievement?.achievement || 0;
      const secondary = achievement?.secondary || 0;

      totalTarget += target;
      totalPrimary += primary;
      totalSecondary += secondary;

      const pGrowth = target > 0 ? Math.round((primary / target) * 100) : (primary > 0 ? 100 : 0);
      const sGrowth = target > 0 ? Math.round((secondary / target) * 100) : (secondary > 0 ? 100 : 0);

      let performance = "N/A";
      let statusColor = "FF94A3B8"; // Slate-400

      if (target > 0) {
        if (pGrowth >= 100) { 
          performance = "EXCEPTIONAL"; 
          statusColor = "FF10B981"; // Emerald-500
        } else if (pGrowth >= 80) { 
          performance = "STABLE"; 
          statusColor = "FF3B82F6"; // Blue-500
        } else if (pGrowth > 0) { 
          performance = "BELOW TARGET"; 
          statusColor = "FFF59E0B"; // Amber-500
        } else {
          performance = "NO DATA";
        }
      }

      const row = sheet.addRow([
        mName,
        target,
        primary,
        `${pGrowth}%`,
        secondary,
        `${sGrowth}%`,
        performance,
        pGrowth >= 100 ? "SUCCESS" : "PENDING"
      ]);

      row.eachCell((cell, colIdx) => {
        cell.border = BORDER_STYLE;
        cell.alignment = { horizontal: 'center' };
        if (colIdx === 7) { // Performance Column
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };
        }
      });
    });

    // Summary Row
    const pTotalGrowth = totalTarget > 0 ? Math.round((totalPrimary / totalTarget) * 100) : 0;
    const sTotalGrowth = totalTarget > 0 ? Math.round((totalSecondary / totalTarget) * 100) : 0;

    const summaryRow = sheet.addRow(["TOTAL", totalTarget, totalPrimary, `${pTotalGrowth}%`, totalSecondary, `${sTotalGrowth}%`, "ANNUAL SCORE", ""]);
    summaryRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.border = BORDER_STYLE;
      cell.alignment = { horizontal: 'center' };
    });

    sheet.columns = [
      { width: 12 }, { width: 18 }, { width: 22 }, { width: 18 }, { width: 22 }, { width: 18 }, { width: 20 }, { width: 15 }
    ];
  }

  if (workbook.worksheets.length === 0) throw new ApiError(404, "No sale data found for selected personnel.");

  const fileName = `Sale_Achievement_${y}_${new Date().getTime()}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  await workbook.xlsx.write(res);
  res.end();
});
