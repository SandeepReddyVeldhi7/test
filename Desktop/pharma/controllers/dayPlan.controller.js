import { DayPlan, User, Role, Territory, Company, TourPlan } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createNotification } from "./notification.controller.js";


export const createDayPlan = asyncHandler(async (req, res) => {
  let { workType, territoryId, jointWork, remarks, date, location, deviation, deviationReason } = req.body;

  const planDate = new Date(date);
  planDate.setHours(0, 0, 0, 0);

  //  FIRST: block duplicate for TODAY
  const existingPlan = await DayPlan.findOne({
    companyId: req.user.companyId,
    userId: req.user._id,
    date: planDate
  });

  if (existingPlan) {
    throw new ApiError(409, "Day plan already submitted for this date");
  }

  //  Check if this is FIRST record for user
  const totalPlans = await DayPlan.countDocuments({
    companyId: req.user.companyId,
    userId: req.user._id
  });

  //  Only if NOT first record → check previous day
  if (totalPlans > 0) {
    const previousDate = new Date(planDate);
    previousDate.setDate(previousDate.getDate() - 1);

    const previousPlan = await DayPlan.findOne({
      companyId: req.user.companyId,
      userId: req.user._id,
      date: previousDate
    });

    if (!previousPlan) {
      const day = previousDate.getDay(); // check previous date

      let autoWorkType, autoRemarks;

      if (day === 0) {
        autoWorkType = "SUNDAY";
        autoRemarks = "Sunday by system";
      } else {
        autoWorkType = "USER_MISSED";
        autoRemarks = "User missed";
      }

      //  INSERT ONLY PREVIOUS DATE
      await DayPlan.create({
        companyId: req.user.companyId,
        userId: req.user._id,
        workType: autoWorkType,
        remarks: autoRemarks,
        date: previousDate,
        location
      });
    }
  }

  // validate
  const allowedWorkTypes = ["FIELD", "MEETING", "LEAVE", "CRM", "JOINT_WORK", "HOLIDAY"];
  if (!allowedWorkTypes.includes(workType)) {
    throw new ApiError(400, "Invalid work type");
  }

  if (!location?.lat || !location?.lng) {
    throw new ApiError(400, "Location (lat, lng) is required");
  }

  const dayPlan = await DayPlan.create({
    companyId: req.user.companyId,
    userId: req.user._id,
    workType,
    territoryId,
    jointWork,
    remarks,
    date: planDate,
    location,
    deviation,
    deviationReason
  });

  // 🔔 Manager notification removed as per request

  res.status(201).json({
    message: "Day plan created successfully",
    data: dayPlan
  });
});


export const getMyDayPlan = asyncHandler(async (req, res) => {
  const { date } = req.query;

  if (!date) {
    throw new ApiError(400, "Date is required");
  }

  const dayPlan = await DayPlan.findOne({
    companyId: req.user.companyId,
    userId: req.user._id,
    date: new Date(date)
  })
    .populate("territoryId", "name type")
    .populate("jointWork.withUserId", "name employeeId");

  if (!dayPlan) {
    throw new ApiError(404, "Day plan not found");
  }

  res.status(200).json({
    data: dayPlan
  });
});
