import { Holiday, Leave, LeavePolicy, User, EDetailing } from "../models/index.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { createNotification } from "./notification.controller.js";

// --- HOLIDAY CONTROLLERS ---

export const getHolidays = asyncHandler(async (req, res, next) => {
  const holidays = await Holiday.find({ companyId: req.user.companyId }).sort({ date: 1 });
  res.status(200).json({ status: "success", data: holidays });
});

export const createHoliday = asyncHandler(async (req, res, next) => {
  const { date, name, type } = req.body;
  
  const holiday = await Holiday.create({
    companyId: req.user.companyId,
    date,
    name,
    type,
    createdBy: req.user.id
  });

  res.status(201).json({ status: "success", data: holiday });
});

export const updateHoliday = asyncHandler(async (req, res, next) => {
  const holiday = await Holiday.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    req.body,
    { new: true, runValidators: true }
  );

  if (!holiday) return next(new ApiError(404, "Holiday not found"));

  res.status(200).json({ status: "success", data: holiday });
});

export const deleteHoliday = asyncHandler(async (req, res, next) => {
  const holiday = await Holiday.findOneAndDelete({
    _id: req.params.id,
    companyId: req.user.companyId
  });

  if (!holiday) return next(new ApiError(404, "Holiday not found"));

  res.status(204).json({ status: "success", data: null });
});

// --- LEAVE CONTROLLERS ---

export const applyLeave = asyncHandler(async (req, res, next) => {
  const { type, startDate, endDate, reason } = req.body;
  const companyId = req.user.companyId;

  // 1. Fetch holidays
  const holidays = await Holiday.find({ companyId });
  const holidayDates = holidays.map(h => new Date(h.date).toISOString().split('T')[0]);

  // 2. Calculate Total Working Days
  let totalDays = 0;
  let curr = new Date(startDate);
  const end = new Date(endDate);

  while (curr <= end) {
    const dateStr = curr.toISOString().split('T')[0];
    const dayOfWeek = curr.getUTCDay(); // 0 is Sunday
    
    // Check if it's NOT a Sunday AND NOT a company holiday
    if (dayOfWeek !== 0 && !holidayDates.includes(dateStr)) {
      totalDays++;
    }
    
    // Move to next day (UTC safe)
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  // 3. (Optional but requested) Balance Check
  // In a full implementation, we'd fetch the policy and compare totalDays against remaining balance.
  // For now, we'll allow it but store the accurate totalDays.
  if (totalDays === 0) {
    throw new ApiError(400, "Leave cannot be applied for only holidays/Sundays.");
  }

  const leave = await Leave.create({
    companyId,
    userId: req.user.id,
    type,
    startDate,
    endDate,
    totalDays,
    reason
  });

  // 🔔 Notify Manager — Leave Applied
  if (req.user.managerId) {
    const start = new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const end = new Date(endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    await createNotification({
      companyId: req.user.companyId,
      recipientId: req.user.managerId,
      category: "LEAVE",
      title: "New Leave Application",
      body: `${req.user.name} applied for ${type.replace("_", " ").toLowerCase()} leave`,
      relatedUserId: req.user._id,
      redirectTo: "LeaveApproval",
      metadata: { leaveId: leave._id.toString(), type, startDate, endDate }
    });
  }

  res.status(201).json({ status: "success", data: leave });
});

export const getMyLeaves = asyncHandler(async (req, res, next) => {
  const leaves = await Leave.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json({ status: "success", data: leaves });
});

export const getPendingLeaves = asyncHandler(async (req, res, next) => {
  const subordinates = await User.find({ managerId: req.user.id }).select("_id");
  const subordinateIds = subordinates.map(s => s._id);

  const leaves = await Leave.find({ 
    userId: { $in: subordinateIds }, 
    status: "PENDING" 
  }).populate("userId", "name employeeId");

  res.status(200).json({ status: "success", data: leaves });
});

export const updateLeaveStatus = asyncHandler(async (req, res, next) => {
  const { status, rejectionReason } = req.body;

  const leave = await Leave.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { 
      status, 
      rejectionReason, 
      approvedBy: req.user.id,
      approvedAt: Date.now()
    },
    { new: true }
  ).populate("userId", "name _id companyId");

  if (!leave) return next(new ApiError(404, "Leave request not found"));

  // 🔔 Notify User — Leave Approved / Rejected
  if (leave.userId) {
    const isApproved = status === "APPROVED";
    await createNotification({
      companyId: req.user.companyId,
      recipientId: leave.userId._id,
      category: "LEAVE",
      title: isApproved ? "Leave Approved ✅" : "Leave Rejected ❌",
      body: isApproved
        ? `Your leave request has been approved`
        : `Your leave request was rejected${rejectionReason ? `: ${rejectionReason}` : ""}`,
      relatedUserId: req.user._id,
      redirectTo: "Leaves",
      metadata: { leaveId: leave._id.toString(), status }
    });
  }

  res.status(200).json({ status: "success", data: leave });
});

// --- LEAVE POLICY CONTROLLERS ---

export const getLeavePolicy = asyncHandler(async (req, res, next) => {
  let policy = await LeavePolicy.findOne({ companyId: req.user.companyId });
  
  if (!policy) {
    policy = await LeavePolicy.create({ companyId: req.user.companyId });
  }

  res.status(200).json({ status: "success", data: policy });
});

export const updateLeavePolicy = asyncHandler(async (req, res, next) => {
  const policy = await LeavePolicy.findOneAndUpdate(
    { companyId: req.user.companyId },
    { ...req.body, updatedBy: req.user.id },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(200).json({ status: "success", data: policy });
});

export const getLeaveBalances = asyncHandler(async (req, res, next) => {
  const policy = await LeavePolicy.findOne({ companyId: req.user.companyId });
  const currentYear = new Date().getUTCFullYear();
  
  const startOfYear = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
  const endOfYear = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));

  const approvedLeaves = await Leave.find({
    userId: req.user.id,
    status: "APPROVED",
    $or: [
      { startDate: { $gte: startOfYear, $lte: endOfYear } },
      { endDate: { $gte: startOfYear, $lte: endOfYear } }
    ]
  });

  const used = {
    SICK_LEAVE: 0,
    CASUAL_LEAVE: 0,
    EARNED_LEAVE: 0,
    LOSS_OF_PAY: 0
  };

  approvedLeaves.forEach(leave => {
    if (used[leave.type] !== undefined) {
      used[leave.type] += (leave.totalDays || 0);
    }
  });

  const quotas = policy || { sickQuota: 12, casualQuota: 12, earnedQuota: 24 };

  const responseData = [
    { label: "Sick Leaves", used: used.SICK_LEAVE, total: quotas.sickQuota, color: "#EF4444", key: "SICK_LEAVE" },
    { label: "Casual Leaves", used: used.CASUAL_LEAVE, total: quotas.casualQuota, color: "#F59E0B", key: "CASUAL_LEAVE" },
    { label: "Earned Leaves (Paid)", used: used.EARNED_LEAVE, total: quotas.earnedQuota, color: "#10B981", key: "EARNED_LEAVE" },
    { label: "Loss of Pay", used: used.LOSS_OF_PAY, total: 0, color: "#64748B", key: "LOSS_OF_PAY", isUnpaid: true },
  ];

  res.status(200).json({ status: "success", data: responseData });
});

// --- E-DETAILING CONTROLLERS ---

export const getEDetailing = asyncHandler(async (req, res, next) => {
  const items = await EDetailing.find({ companyId: req.user.companyId }).sort({ createdAt: -1 });
  res.status(200).json({ status: "success", data: items });
});

export const createEDetailing = asyncHandler(async (req, res, next) => {
  const { title, description } = req.body;
  
  if (!req.file) throw new ApiError(400, "Please upload a PDF file");

  const fileUrl = `/uploads/edetailing/${req.file.filename}`;
  const fileName = req.file.originalname;
  const fileSize = req.file.size;
  
  const item = await EDetailing.create({
    companyId: req.user.companyId,
    title,
    description,
    fileUrl,
    fileName,
    fileSize,
    uploadedBy: req.user.id
  });

  res.status(201).json({ status: "success", data: item });
});

export const deleteEDetailing = asyncHandler(async (req, res, next) => {
  const item = await EDetailing.findOneAndDelete({
    _id: req.params.id,
    companyId: req.user.companyId
  });

  if (!item) return next(new ApiError(404, "E-Detailing item not found"));

  res.status(204).json({ status: "success", data: null });
});
