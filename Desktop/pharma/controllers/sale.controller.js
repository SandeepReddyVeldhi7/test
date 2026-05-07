import { MonthlyTarget, MonthlyAchievement, User } from "../models/index.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";

export const submitAchievement = asyncHandler(async (req, res) => {
  const { year, month, achievement, secondary } = req.body;
  const userId = req.user._id;
  const companyId = req.user.companyId;

  if (!year || !month || achievement === undefined) {
    throw new ApiError(400, "Year, Month and Achievement amount are required");
  }

  const achievementDoc = await MonthlyAchievement.findOneAndUpdate(
    { userId, companyId, year },
    { $set: { "achievements.$[elem].achievement": achievement, "achievements.$[elem].secondary": secondary } },
    { 
      arrayFilters: [{ "elem.month": month }],
      upsert: true, 
      new: true,
      setDefaultsOnInsert: true
    }
  );

  // Fallback if the month wasn't in the array (for non-prepopulated docs)
  if (achievementDoc && !achievementDoc.achievements.some(a => a.month === month)) {
    await MonthlyAchievement.updateOne(
      { _id: achievementDoc._id },
      { $push: { achievements: { month, achievement, secondary } } }
    );
  }

  res.status(200).json({
    success: true,
    message: "Achievement updated successfully",
    data: achievementDoc,
  });
});

export const getTargetViewData = asyncHandler(async (req, res) => {
  const { year, userIds: queryUserIds } = req.query;
  const companyId = req.user.companyId;

  if (!year) {
    throw new ApiError(400, "Year is required");
  }

  const userIdsArr = queryUserIds ? queryUserIds.split(",") : [req.user._id];

  const results = await Promise.all(userIdsArr.map(async (uid) => {
    try {
      const user = await User.findById(uid).populate("roleId", "name");
      if (!user) return null;

      const [targetDoc, achievementDoc] = await Promise.all([
        MonthlyTarget.findOne({ userId: uid, companyId, year }),
        MonthlyAchievement.findOne({ userId: uid, companyId, year }),
      ]);

      return {
        user: {
          id: user._id,
          name: user.name,
          role: user.roleId?.name || "Member",
          employeeId: user.employeeId
        },
        targets: targetDoc ? targetDoc.targets : [],
        achievements: achievementDoc ? achievementDoc.achievements : []
      };
    } catch (err) {
      return null;
    }
  }));

  res.status(200).json({
    success: true,
    data: results.filter(r => r !== null)
  });
});

export const submitTarget = asyncHandler(async (req, res) => {
  const { userId, year, month, target } = req.body;
  const companyId = req.user.companyId;

  if (!userId || !year || !month || target === undefined) {
    throw new ApiError(400, "UserId, Year, Month and Target amount are required");
  }

  const targetDoc = await MonthlyTarget.findOneAndUpdate(
    { userId, companyId, year },
    { $set: { "targets.$[elem].target": target, createdBy: req.user._id } },
    { 
      arrayFilters: [{ "elem.month": month }],
      upsert: true, 
      new: true,
      setDefaultsOnInsert: true
    }
  );

  // Fallback if the month wasn't in the array
  if (targetDoc && !targetDoc.targets.some(t => t.month === month)) {
    await MonthlyTarget.updateOne(
      { _id: targetDoc._id },
      { $push: { targets: { month, target } } }
    );
  }

  res.status(200).json({
    success: true,
    message: "Target updated successfully",
    data: targetDoc,
  });
});
