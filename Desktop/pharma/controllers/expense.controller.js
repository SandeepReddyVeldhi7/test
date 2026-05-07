import mongoose from "mongoose";
import {User} from "../models/index.js";
import {Expense} from "../models/index.js";
import {DayPlan} from "../models/index.js";
import {Territory} from "../models/index.js";
import {Company} from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createNotification } from "./notification.controller.js";
import { getISTDate, formatDateKey } from "../utils/DateUtils.js";

export const createExpense = asyncHandler(async (req, res) => {
  const { date, territoryId, expenses } = req.body;

  if (!date || !territoryId || !expenses?.length) {
    throw new ApiError(400, "Date, territory and expenses required");
  }

  const company = await Company.findById(req.user.companyId);
  if (!company || company.status !== "ACTIVE") {
    throw new ApiError(403, "Company not active");
  }

  const d = getISTDate(date);
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();

  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const newDayEntry = {
    date,
    territoryId,
    expenses,
    totalAmount,
    status: "PENDING"
  };

  // Find and update or create monthly doc
  const monthlyExp = await Expense.findOneAndUpdate(
    { companyId: req.user.companyId, userId: req.user._id, month, year },
    { 
      $pull: { days: { date: new Date(date) } } // Remove if exists (Noon-normalized date comparison)
    },
    { upsert: true, new: true }
  );

  monthlyExp.days.push(newDayEntry);
  await monthlyExp.save();

  res.status(201).json({
    message: "Expense saved successfully",
    data: monthlyExp
  });
});


export const getMyExpenses = asyncHandler(async (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    throw new ApiError(400, "Month and year required");
  }

  const expenseDoc = await Expense.findOne({
    companyId: req.user.companyId,
    userId: req.user._id,
    month: Number(month),
    year: Number(year)
  }).populate("days.territoryId", "area subArea");

  res.status(200).json({
    success: true,
    data: expenseDoc ? [expenseDoc] : []
  });
});


export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!expense) {
    throw new ApiError(404, "Expense not found");
  }

  if (!["PENDING", "REJECTED", "RESUBMITTED"].includes(expense.approval.status)) {
    throw new ApiError(
      403,
      "This expense is locked and cannot be modified"
    );
  }

  // If was REJECTED, mark as RESUBMITTED
  if (expense.approval.status === "REJECTED") {
    expense.approval.status = "RESUBMITTED";
  }

  expense.expenses = req.body.expenses;
  expense.totalAmount = req.body.expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  await expense.save();

  res.status(200).json({
    message: "Expense updated successfully",
    data: expense
  });
});


export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!expense) {
    throw new ApiError(404, "Expense not found");
  }

  if (!["PENDING", "REJECTED", "RESUBMITTED"].includes(expense.approval.status)) {
    throw new ApiError(
      403,
      "Approved expense cannot be deleted"
    );
  }

  await expense.deleteOne();

  res.status(200).json({
    message: "Expense deleted successfully"
  });
});




export const approveExpense = asyncHandler(async (req, res) => {
  const { status, rejectionReason } = req.body;
  const { id: dayId } = req.params;

  // Find the monthly document that contains this specific day
  const expenseDoc = await Expense.findOne({
    "days._id": dayId
  }).populate("userId");

  if (!expenseDoc) {
    throw new ApiError(404, "Day entry not found in any monthly expense");
  }

  // Verify manager relationship
  if (expenseDoc.userId.managerId?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the assigned manager can approve this expense");
  }

  // Update the specific day in the days array
  const dayIndex = expenseDoc.days.findIndex(d => d._id.toString() === dayId);
  if (dayIndex !== -1) {
    expenseDoc.days[dayIndex].status = status;
    expenseDoc.days[dayIndex].rejectionReason = status === "REJECTED" ? rejectionReason : null;
  }

  await expenseDoc.save();

  // 🔔 Notify User
  const expenseOwner = expenseDoc.userId?._id || expenseDoc.userId;
  if (expenseOwner) {
    const isApproved = status === "APPROVED";
    await createNotification({
      companyId: expenseDoc.companyId,
      recipientId: expenseOwner,
      category: "EXPENSE",
      title: isApproved ? "Expense Approved ✅" : "Expense Rejected ❌",
      body: isApproved
        ? `A daily expense in your monthly report has been approved`
        : `An expense was rejected${rejectionReason ? `: ${rejectionReason}` : ""}`,
      relatedUserId: req.user._id,
      redirectTo: "ExpenseForm",
      metadata: { expenseDocId: expenseDoc._id.toString(), dayId, status }
    });
  }

  res.status(200).json({
    success: true,
    message: `Daily expense ${status.toLowerCase()} successfully`
  });
});



export const bulkUpsertExpenses = asyncHandler(async (req, res) => {
  const { month, year, expenses: inputDays } = req.body;

  if (!month || !year || !Array.isArray(inputDays)) {
    throw new ApiError(400, "Month, year and expenses array required");
  }

  const company = await Company.findById(req.user.companyId);
  if (!company || company.status !== "ACTIVE") {
    throw new ApiError(403, "Company not active");
  }

  // Calculate total month amount and prepare days
  let totalMonthAmount = 0;
  const processedDays = inputDays.map(d => {
    const dayTotal = d.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    totalMonthAmount += dayTotal;
    return {
      ...d,
      totalAmount: dayTotal,
      status: d.status || "PENDING" // Trust provided status (e.g. RESUBMITTED)
    };
  });

  const monthlyExp = await Expense.findOneAndUpdate(
    { companyId: req.user.companyId, userId: req.user._id, month, year },
    { 
      days: processedDays,
      totalMonthAmount,
      "approval.status": "PENDING" // Reset monthly approval to pending on bulk save
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 🔔 Notify Manager
  const expenseUser = await User.findById(req.user._id).select("managerId name");
  if (expenseUser?.managerId) {
    await createNotification({
      companyId: req.user.companyId,
      recipientId: expenseUser.managerId,
      category: "EXPENSE",
      title: "Monthly Expenses Submitted",
      body: `${req.user.name} submitted expenses for ${month}/${year}`,
      relatedUserId: req.user._id,
      redirectTo: "ExpenseApproval",
      metadata: { month, year }
    });
  }

  res.status(200).json({
    message: "Monthly expenses updated successfully",
    data: monthlyExp
  });
});

export const uploadBill = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/expenses/${req.file.filename}`;

  res.status(200).json({
    success: true,
    url: fileUrl
  });
});

/* -------------------------------- APPROVALS LIST ------------------------- */

export const getApprovalsList = asyncHandler(async (req, res) => {
  // 1. Find subordinates
  const subordinates = await User.find({ managerId: req.user._id }).select("_id");
  const subordinateIds = subordinates.map(s => s._id);

  if (subordinateIds.length === 0) {
    return res.json({ count: 0, groupedData: [] });
  }

  // 2. Find monthly docs with pending or rejected status
  const monthlyExpenses = await Expense.find({
    userId: { $in: subordinateIds },
    "approval.status": { $in: ["PENDING", "REJECTED"] }
  })
    .populate("userId", "name employeeId email mobile")
    .populate("days.territoryId", "area subArea")
    .sort({ year: -1, month: -1 });

  // 3. Group for UI (matching existing hierarchy)
  const groupedByMonth = {};
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  monthlyExpenses.forEach(doc => {
    const monthKey = `${doc.year}-${doc.month - 1}`;
    if (!groupedByMonth[monthKey]) {
      groupedByMonth[monthKey] = {
        month: doc.month - 1,
        year: doc.year,
        monthName: monthNames[doc.month - 1],
        plans: []
      };
    }

    groupedByMonth[monthKey].plans.push({
      userId: doc.userId,
      expenses: doc.days, // In new structure, "expenses" in UI refers to daily items
      month: doc.month - 1,
      year: doc.year,
      _id: doc._id
    });
  });

  res.json({
    count: Object.keys(groupedByMonth).length,
    groupedData: Object.values(groupedByMonth)
  });
});

export const approveOverallExpenses = asyncHandler(async (req, res) => {
  const { userId, month, year, status, rejectionReason } = req.body;

  if (!userId || month === undefined || !year) {
    throw new ApiError(400, "userId, month, and year are required");
  }

  const expenseDoc = await Expense.findOne({
    userId,
    month: month + 1,
    year
  });

  if (!expenseDoc) {
    throw new ApiError(404, "Monthly expense not found");
  }

  expenseDoc.approval.status = status || "APPROVED";
  expenseDoc.approval.approvedBy = req.user._id;
  expenseDoc.approval.approvedAt = new Date();
  expenseDoc.approval.rejectionReason = rejectionReason || null;

  // Also update all daily statuses
  expenseDoc.days = expenseDoc.days.map(d => ({
    ...d,
    status: status || "APPROVED"
  }));

  await expenseDoc.save();

  // 🔔 Notify User
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  await createNotification({
    companyId: req.user.companyId,
    recipientId: userId,
    category: "EXPENSE",
    title: status === "REJECTED" ? "Expenses Rejected ❌" : "Expenses Approved ✅",
    body: `Your expenses for ${monthNames[month]} ${year} have been ${status === "REJECTED" ? "rejected" : "approved"}`,
    relatedUserId: req.user._id,
    redirectTo: "ExpenseForm",
    metadata: { month: month + 1, year, status }
  });

  res.json({
    success: true,
    message: `Monthly expense ${status || "APPROVED"} successfully`
  });
});

/* -------------------------------- ADMIN OVERVIEW ------------------------- */

export const getOrganizationalExpenseOverview = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { startDate, endDate } = req.query;

  const match = { companyId: new mongoose.Types.ObjectId(companyId) };
  if (startDate && endDate) {
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    match["days.date"] = { $gte: s, $lte: e };
  }

  const result = await Expense.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
    { $unwind: "$days" },
    { $match: match["days.date"] ? { "days.date": match["days.date"] } : {} },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              total: { $sum: "$days.totalAmount" },
              outstation: { 
                $sum: { 
                  $cond: [
                    { $in: ["$days.area", ["OUT STATION", "EX- STATION", "OUT-STATION"]] }, 
                    "$days.totalAmount", 
                    0
                  ] 
                } 
              },
              local: { 
                $sum: { 
                  $cond: [
                    { $in: ["$days.area", ["OUT STATION", "EX- STATION", "OUT-STATION"]] }, 
                    0, 
                    "$days.totalAmount"
                  ] 
                } 
              }
            }
          }
        ]
      }
    }
  ]);

  const stats = result[0].summary[0] || { total: 0, outstation: 0, local: 0 };
  
  const categories = [
    { label: "ORG_TOTAL", value: stats.total },
    { label: "OUTSTATION", value: stats.outstation },
    { label: "LOCAL", value: stats.local }
  ];

  res.json({
    success: true,
    data: {
      categories,
      summary: result[0].summary[0] || { total: 0, approved: 0, pending: 0 }
    }
  });
});

export const getAdminClaimsList = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { startDate, endDate } = req.query;

  const filter = { companyId };
  if (startDate && endDate) {
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    filter["days.date"] = { $gte: s, $lte: e };
  }

  const claims = await Expense.find(filter)
    .populate("userId", "name employeeId roleId")
    .select("userId month year totalMonthAmount approval updatedAt days.date days.totalAmount days.area")
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

  const summaries = claims.map(doc => ({
    _id: doc._id,
    name: doc.userId?.name || "System",
    employeeId: doc.userId?.employeeId,
    designation: doc.userId?.roleId?.name || "Personnel",
    detail: `Monthly Report for ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][doc.month-1]} ${doc.year}`,
    amount: `₹${doc.totalMonthAmount || 0}`,
    category: "MONTHLY",
    status: doc.approval?.status || "PENDING",
    avatar: doc.userId?.name?.charAt(0) || "?",
    avatarBg: "#4f46e5",
    userId: doc.userId?._id?.toString() || doc.userId?.toString(),
    updatedAt: doc.updatedAt,
    rawDays: doc.days // 🗒️ Full daily logs for the breakdown modal
  }));

  res.json({
    success: true,
    data: summaries
  });
});

