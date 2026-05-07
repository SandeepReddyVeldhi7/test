import { ActivityLog, User } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createNotification } from "./notification.controller.js";

/**
 * @desc Get list of pending DCR approvals grouped by Month -> User
 * @route GET /api/activities/approvals
 */
export const getDCRApprovalsList = asyncHandler(async (req, res) => {
    // 1. Find subordinates
    const subordinates = await User.find({ managerId: req.user._id }).select("_id");
    const subordinateIds = subordinates.map(s => s._id);

    if (subordinateIds.length === 0) {
        return res.json({ count: 0, groupedData: [] });
    }

    // 2. Find pending activity logs for subordinates
    // Filter to only "DCR" actions as they are the ones needing approval
    const activities = await ActivityLog.find({
        userId: { $in: subordinateIds },
        action: "DCR",
        "approval.status": "PENDING"
    })
        .populate("userId", "name employeeId email mobile")
        .populate("clientId", "name designation area")
        .sort({ timestamp: -1 });

    // 3. Flattened grouping: User -> Days
    const usersMap = {};

    activities.forEach(act => {
        if (!act.userId) return;
        const uKey = act.userId._id?.toString() || act.userId.toString();
        if (!usersMap[uKey]) {
            usersMap[uKey] = {
                user: act.userId,
                days: {}
            };
        }

        const d = new Date(act.timestamp);
        const dateStr = d.toISOString().split('T')[0];
        if (!usersMap[uKey].days[dateStr]) {
            usersMap[uKey].days[dateStr] = {
                date: dateStr,
                logs: [],
                status: act.approval.status,
                managerComment: act.approval.managerComment
            };
        }

        usersMap[uKey].days[dateStr].logs.push(act);
    });

    // 4. Transform to array for frontend
    const finalData = Object.values(usersMap).map(userGroup => ({
        ...userGroup,
        days: Object.values(userGroup.days).sort((a, b) => b.date.localeCompare(a.date))
    }));

    res.json({
        count: finalData.length,
        groupedData: finalData
    });
});

/**
 * @desc Approve or Reject all activities for a specific user and day
 * @route PATCH /api/activities/approve-day
 */
export const approveDCRDay = asyncHandler(async (req, res) => {
    const { userId, date, status, managerComment } = req.body;

    if (!userId || !date || !status) {
        throw new ApiError(400, "userId, date, and status are required");
    }

    const d = new Date(date);
    const startOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));

    // Verify manager relationship
    const subordinance = await User.findOne({ _id: userId, managerId: req.user._id });
    if (!subordinance) {
        throw new ApiError(403, "Not authorized to approve this user's DCR");
    }

    // Update all DCR logs for that day
    const result = await ActivityLog.updateMany(
        {
            userId,
            action: "DCR",
            timestamp: { $gte: startOfDay, $lte: endOfDay }
        },
        {
            $set: {
                "approval.status": status,
                "approval.approvedBy": req.user._id,
                "approval.approvedAt": new Date(),
                "approval.managerComment": managerComment || ""
            }
        }
    );

    if (result.matchedCount === 0) {
        throw new ApiError(404, "No activities found for this date");
    }

    // 🔔 Notify User
    await createNotification({
        companyId: req.user.companyId,
        recipientId: userId,
        type: "PUSH",
        category: "ACTIVITY",
        title: `DCR ${status}`,
        body: status === "REJECTED"
            ? `Your DCR for ${date} was rejected: ${managerComment}`
            : `Your DCR for ${date} has been approved.`,
        relatedUserId: req.user._id,
        redirectTo: "MyActivity",
        metadata: { date, status }
    });

    res.json({
        success: true,
        message: `DCR ${status} for ${date}`,
        updatedCount: result.modifiedCount
    });
});
