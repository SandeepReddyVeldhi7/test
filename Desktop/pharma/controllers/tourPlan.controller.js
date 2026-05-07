import { TourPlan, User, Territory, Company } from "../models/index.js";
import { format } from "date-fns";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createNotification } from "./notification.controller.js";
import { getISTDate, formatDateKey } from "../utils/DateUtils.js";

/* -------------------------------- HELPERS -------------------------------- */

const normalizeDate = (d) => formatDateKey(d);

const validatePlans = async (plans, user) => {
  const filteredPlans = plans.filter(
    (p) => new Date(p.date).getUTCDay() !== 0
  );
  console.log(filteredPlans, "filteredPlans")
  if (filteredPlans.length === 0) {
    throw new ApiError(400, "No valid working days");
  }

  // ❌ Duplicate dates
  const dates = filteredPlans.map((p) => normalizeDate(p.date));
  if (dates.length !== new Set(dates).size) {
    throw new ApiError(400, "Duplicate dates found");
  }

  // 🔥 Batch fetch
  const territoryIds = filteredPlans
    .filter((p) => p.territoryId)
    .map((p) => p.territoryId);

  const jointWorkerIds = filteredPlans.flatMap(
    (p) => p.jointWorkers || []
  );

  const [territories, users, currentUser] = await Promise.all([
    Territory.find({
      _id: { $in: territoryIds },
      companyId: user.companyId,
      employeeId: user._id,
    }),
    User.find({ _id: { $in: jointWorkerIds } }).populate("roleId"),
    User.findById(user._id).populate("roleId"),
  ]);

  const territoryMap = new Map(
    territories.map((t) => [t._id.toString(), t])
  );

  const userMap = new Map(
    users.map((u) => [u._id.toString(), u])
  );

  for (const plan of filteredPlans) {
    if (!plan.date || !plan.workType) {
      throw new ApiError(400, "Date & workType required");
    }

    if (plan.workType === "FIELD" && !plan.territoryId) {
      const dateStr = new Date(plan.date).toISOString().split("T")[0];
      throw new ApiError(400, `Territory required for ${dateStr}`);
    }

    if (plan.territoryId && !territoryMap.has(plan.territoryId)) {
      throw new ApiError(400, "Invalid territory");
    }

    if (plan.jointWorkers?.length) {
      for (const jwId of plan.jointWorkers) {
        const jw = userMap.get(jwId);
        if (!jw) throw new ApiError(400, "Invalid joint worker");
        // Removed role level check as requested. 
        // TODO: Add new seniority check rule here.
      }
    }
  }

  return filteredPlans;
};

/* -------------------------------- CREATE -------------------------------- */

export const createTourPlan = asyncHandler(async (req, res) => {
  const { month, year, plans } = req.body;

  if (!month || !year || !Array.isArray(plans)) {
    throw new ApiError(400, "Month, year, plans required");
  }

  const now = getISTDate();
  if (
    year < now.getUTCFullYear() ||
    (year === now.getUTCFullYear() && month < now.getUTCMonth() + 1)
  ) {
    throw new ApiError(403, "Cannot submit past plans");
  }

  const company = await Company.findById(req.user.companyId);
  if (!company || company.status !== "ACTIVE") {
    throw new ApiError(403, "Company inactive");
  }

  const validatedPlans = await validatePlans(plans, req.user);

  const tourPlan = await TourPlan.create({
    companyId: req.user.companyId,
    userId: req.user._id,
    month,
    year,
    plans: validatedPlans,
    createdBy: req.user._id,
  });

  // 🔔 Notify Manager
  if (req.user.managerId) {
    await createNotification({
      companyId: req.user.companyId,
      recipientId: req.user.managerId,
      category: "TOUR_PLAN",
      title: "New Tour Plan Submission",
      body: `${req.user.name} created tourplan for ${month}/${year}`,
      relatedUserId: req.user._id,
      redirectTo: "TourPlanApproval",
      metadata: { month, year, tourPlanId: tourPlan._id }
    });
  }

  res.status(201).json({
    message: "Tour plan created",
    data: tourPlan,
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

  // 2. Find pending/rejected tour plans for these subordinates
  const plans = await TourPlan.find({
    userId: { $in: subordinateIds },
    "approval.status": { $in: ["PENDING", "REJECTED"] }
  })
    .populate("userId", "name employeeId email mobile")
    .populate("plans.territoryId")
    .populate("plans.clients")
    .populate("plans.jointWorkers")
    .sort({ updatedAt: -1 });

  // 3. Group by month and year
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const groupedMap = {};

  plans.forEach(plan => {
    const key = `${plan.year}-${plan.month}`;
    if (!groupedMap[key]) {
      groupedMap[key] = {
        year: plan.year,
        month: plan.month,
        monthName: monthNames[plan.month - 1],
        plans: []
      };
    }
    groupedMap[key].plans.push(plan);
  });

  const groupedData = Object.values(groupedMap).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  res.json({
    count: plans.length,
    groupedData
  });
});


/* -------------------------------- GET -------------------------------- */

export const getTourPlans = asyncHandler(async (req, res) => {
  console.log("req", req.user)
  const { month, year, userId, page = 1, limit = 10 } = req.query;
  console.log("month", month);
  console.log("year", year);
  console.log("userId", userId);
  console.log("page", page);
  console.log("limit", limit);

  if (!month || !year) {
    throw new ApiError(400, "Month & year required");
  }

  const query = {
    companyId: req.user.companyId,
    month: Number(month),
    year: Number(year),
  };

  // If userId is provided, check if it's the current user or a subordinate
  if (userId && userId !== req.user._id.toString()) {
    const subordinate = await User.findOne({ _id: userId || req.user._id, managerId: req.user._id });
    if (!subordinate) {
      throw new ApiError(403, "Not authorized to view this plan");
    }
    query.userId = userId || req.user._id;
  } else {
    query.userId = req.user._id;
  }

  const plans = await TourPlan.find(query)
    .populate("userId", "name employeeId")
    .populate("plans.territoryId", "area subArea")
    .populate("plans.clients", "name")
    .populate("plans.jointWorkers", "name employeeId")
    .lean()
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    count: plans.length,
    data: plans,
  });
});

/* -------------------------------- CHECK PLAN ----------------------------- */

export const checkFieldPlan = asyncHandler(async (req, res) => {
  const { date, clientId } = req.query;

  if (!date || !clientId) {
    throw new ApiError(400, "Date and ClientId are required");
  }

  const queryDate = new Date(date);
  const month = queryDate.getUTCMonth() + 1;
  const year = queryDate.getUTCFullYear();

  // Find approved tour plan for this user for the specified month/year
  const tourPlan = await TourPlan.findOne({
    companyId: req.user.companyId,
    userId: req.user._id,
    month,
    year,
    "approval.status": "APPROVED",
  });

  if (!tourPlan) {
    return res.json({
      isPlanned: false,
      reason: "No approved tour plan found for this month",
    });
  }

  // Compare dates using ISO string parts (YYYY-MM-DD)
  const targetDateStr = queryDate.toISOString().split("T")[0];
  const planForDay = tourPlan.plans.find(
    (p) => p.date.toISOString().split("T")[0] === targetDateStr
  );

  if (!planForDay) {
    return res.json({
      isPlanned: false,
      reason: "No entries found in tour plan for this date",
    });
  }

  // Check if client is in the planned list
  const isPlanned = planForDay.clients.some(
    (c) => c.toString() === clientId
  );

  res.json({
    isPlanned,
    plannedWorkType: planForDay.workType,
    planDetails: planForDay,
  });
});

/* -------------------------------- UPDATE -------------------------------- */

export const updateTourPlan = asyncHandler(async (req, res) => {
  const { plans } = req.body;

  const tourPlan = await TourPlan.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!tourPlan) throw new ApiError(404, "Not found");

  if (!["PENDING", "REJECTED"].includes(tourPlan.approval.status)) {
    throw new ApiError(403, "Cannot edit after approval");
  }

  const validatedPlans = await validatePlans(plans, req.user);

  // Mark modified/rejected plans as RESUBMITTED
  const newPlans = validatedPlans.map(p => {
    const pDateKey = formatDateKey(p.date || p.dateKey);
    const existing = tourPlan.plans.find(ep => formatDateKey(ep.date || ep.dateKey) === pDateKey);
    
    if (existing && (existing.status === "REJECTED" || existing.status === "RESUBMITTED")) {
      return { ...p, status: "RESUBMITTED" };
    }
    return p;
  });

  tourPlan.plans = newPlans;
  tourPlan.approval.status = "PENDING";

  await tourPlan.save();

  // 🔔 Notify Manager — Tour Plan Resubmitted
  if (req.user.managerId) {
    await createNotification({
      companyId: req.user.companyId,
      recipientId: req.user.managerId,
      category: "TOUR_PLAN",
      title: "Tour Plan Resubmitted",
      body: `${req.user.name} resubmitted their tour plan for ${tourPlan.month}/${tourPlan.year}`,
      relatedUserId: req.user._id,
      redirectTo: "TourPlanApproval",
      metadata: { tourPlanId: tourPlan._id.toString(), month: tourPlan.month, year: tourPlan.year }
    });
  }

  res.json({ message: "Updated", data: tourPlan });
});

/* -------------------------------- DELETE -------------------------------- */

export const deleteTourPlan = asyncHandler(async (req, res) => {
  const tourPlan = await TourPlan.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!tourPlan) throw new ApiError(404, "Not found");

  if (!["PENDING", "REJECTED"].includes(tourPlan.approval.status)) {
    throw new ApiError(403, "Cannot delete approved plan");
  }

  await tourPlan.deleteOne();

  res.json({ message: "Deleted" });
});

/* -------------------------------- APPROVE -------------------------------- */

export const approveTourPlan = asyncHandler(async (req, res) => {
  const { status, rejectionReason, dayStatuses } = req.body;

  const tourPlan = await TourPlan.findById(req.params.id)
    .populate("userId");

  if (!tourPlan) throw new ApiError(404, "Not found");

  // Verify manager relationship instead of role level
  if (tourPlan.userId.managerId?.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the assigned manager can approve this tour plan");
  }

  if (tourPlan.approval.status === "APPROVED") {
    throw new ApiError(403, "Plan is already approved and locked");
  }

  // Handle day-level statuses if provided
  if (Array.isArray(dayStatuses)) {
    dayStatuses.forEach(({ date, status: dStatus, managerComment }) => {
      const planItem = tourPlan.plans.find(p => p.date.toISOString() === new Date(date).toISOString());
      if (planItem) {
        planItem.status = dStatus;
        if (managerComment) planItem.managerComment = managerComment;
      }
    });

    // If any day is REJECTED, the overall status becomes REJECTED
    // If all are APPROVED, overall becomes APPROVED
    const hasRejected = tourPlan.plans.some(p => p.status === "REJECTED");
    const allApproved = tourPlan.plans.every(p => p.status === "APPROVED");

    if (hasRejected) {
      tourPlan.approval.status = "REJECTED";
    } else if (allApproved) {
      tourPlan.approval.status = "APPROVED";
    } else {
      tourPlan.approval.status = "PENDING"; // Partially handled
    }
  } else {
    // Top-level status update
    tourPlan.approval.status = status;
    // Update all plans to match top-level if approved/rejected globally
    tourPlan.plans.forEach(p => {
      p.status = status;
    });
  }

  tourPlan.approval.approvedBy = req.user._id;
  tourPlan.approval.approvedAt = new Date();
  tourPlan.approval.rejectionReason =
    tourPlan.approval.status === "REJECTED" ? rejectionReason : null;

  await tourPlan.save();


  // 🔔 Notify User
  const finalStatus = tourPlan.approval.status;
  const rejectedDays = tourPlan.plans
    .filter(p => p.status === "REJECTED")
    .map(p => format(new Date(p.date), "MMM dd"))
    .join(", ");

  await createNotification({
    companyId: tourPlan.companyId,
    recipientId: tourPlan.userId._id,
    type: "PUSH",
    category: "TOUR_PLAN",
    title: `Tour Plan ${finalStatus}`,
    body: finalStatus === "REJECTED"
      ? (rejectedDays 
          ? `Your tour plan for ${tourPlan.month}/${tourPlan.year} has rejections for: ${rejectedDays}. Please check manager comments.`
          : `Your tour plan for ${tourPlan.month}/${tourPlan.year} was rejected: ${tourPlan.approval.rejectionReason || "Please check comments"}`)
      : `Your tour plan for ${tourPlan.month}/${tourPlan.year} has been approved.`,
    relatedUserId: req.user._id,
    metadata: { tourPlanId: tourPlan._id, status: finalStatus }
  });

  res.json({
    message: `Plan ${status}`,
    data: tourPlan,
  });
});