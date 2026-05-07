import mongoose from "mongoose";
import { Territory, User, Role, Company, ChatRoom, Plan, StatusHistory } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import bcrypt from "bcryptjs";
import { sendEmail, sendOtpEmail } from "../services/email.service.js";
import UserCreateOtp from "../models/UserCreateOtp.js";

/**
 * Helper to automatically add a new user to Company and Manager groups
 */
async function addUserToGroups(userId, companyId, managerId) {
  try {
    const company = await Company.findById(companyId).populate("plan");
    if (!company) return;

    const plan = company.plan;
    const autoChatEnabled = plan?.permissions?.includes("internalChat") || plan?.features?.includes("internalChat");
    if (!autoChatEnabled) return;

    // 1. Add to Company Group
    const companyRoom = await ChatRoom.findOne({ companyId, isCompanyGroup: true });
    if (companyRoom) {
      await ChatRoom.updateOne(
        { _id: companyRoom._id },
        { $addToSet: { members: userId } }
      );
      console.log(`[AutoGroup] User ${userId} added to Company Group`);
    }

    // 2. Add to/Create Manager Group
    if (managerId) {
      let managerRoom = await ChatRoom.findOne({ companyId, managerId });

      const managerUser = await User.findById(managerId);
      if (managerUser) {
        if (!managerRoom) {
          // Create new group for this manager's team
          managerRoom = await ChatRoom.create({
            companyId,
            type: "GROUP",
            name: `${managerUser.name}'s Team`,
            managerId: managerId,
            members: [managerId, userId],
            admins: [managerId],
            createdBy: managerId
          });
          console.log(`[AutoGroup] Manager Group created for ${managerUser.name}`);
        } else {
          // Add to existing group
          await ChatRoom.updateOne(
            { _id: managerRoom._id },
            { $addToSet: { members: userId } }
          );
          console.log(`[AutoGroup] User ${userId} added to ${managerUser.name}'s Team`);
        }
      }
    }
  } catch (err) {
    console.error("[AutoGroup] Error in addUserToGroups:", err.message);
  }
}

/**
 * 💼 Helper to store Salary Revisions into Compensation model
 */
async function saveSalaryRevisions(userId, companyId, revisions, creatorId) {
  if (!revisions || !Array.isArray(revisions) || revisions.length === 0) return;

  const Compensation = mongoose.model("Compensation");
  let compDoc = await Compensation.findOne({ userId });

  // Get the latest revision from the incoming array (usually just one if simplified)
  const incoming = revisions.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const totalAmount = (incoming.components || []).reduce((sum, c) => sum + (Number(c.value) || 0), 0);

  const newRevData = {
    effectiveFrom: incoming.effectiveFrom,
    label: incoming.label || "Salary Adjustment",
    designation: incoming.designation || "Personnel",
    components: incoming.components,
    totalAmount: totalAmount,
    isLocked: true,
    updatedBy: creatorId,
    createdAt: new Date()
  };

  if (!compDoc) {
    // Initial creation
    await Compensation.create({
      userId,
      companyId,
      current: newRevData,
      history: []
    });
  } else {
    // 🛡️ Auto-Snapshot Logic: If total amount or components changed, push old current to history
    const hasChanged = compDoc.current.totalAmount !== totalAmount ||
      compDoc.current.effectiveFrom !== incoming.effectiveFrom;

    if (hasChanged) {
      // Push old current to history and set new one
      compDoc.history.unshift(compDoc.current);
      compDoc.current = newRevData;
    } else {
      // Just update labels/designation if total is same (typo fix mode)
      compDoc.current = { ...compDoc.current, ...newRevData, createdAt: compDoc.current.createdAt };
    }

    // Maintain history limit if needed (optional)
    await compDoc.save();
  }
}


export const createUser = asyncHandler(async (req, res) => {
  const {
    name, email, mobile, employeeId, roleId, password,
    managerId, managerName, managerType,
    stations, subAreas,
    targets, designation, dailyAllowance, salaryRevisions,
    joiningDate
  } = req.body;
  const companyId = req.user.companyId;

  // 1. Validation
  const exists = await User.findOne({ companyId, email: email.toLowerCase() });
  if (exists) throw new ApiError(400, "User with this email already exists");

  const idExists = await User.findOne({ companyId, employeeId });
  if (idExists) throw new ApiError(400, "User with this Employee ID already exists");

  const hashedPassword = await bcrypt.hash(password, 10);

  // 2. Create User
  const user = await User.create({
    companyId,
    name,
    email: email.toLowerCase(),
    mobile,
    employeeId,
    designation,
    roleId,
    password: hashedPassword,
    managerId: managerId || null,
    managerName,
    managerType,
    isVerified: true,
    createdBy: req.user._id,
    stations: stations || [],
    subAreas: subAreas || [],
    dailyAllowance,
    joiningDate,
    isActive: true
  });

  // 2.5 Save Salary Revisions (Locked for history)
  await saveSalaryRevisions(user._id, companyId, salaryRevisions, req.user._id);

  // Deployment Infrastructure already handled in User.create

  // 4. Create Monthly Targets (Multi-year support)
  if (targets && Array.isArray(targets) && targets.length > 0) {
    for (const yearData of targets) {
      if (!yearData.year) continue;
      await mongoose.model("MonthlyTarget").findOneAndUpdate(
        { userId: user._id, year: yearData.year },
        {
          companyId,
          targets: yearData.targets.map(t => ({
            month: t.month,
            target: Number(t.target) || 0
          })),
          createdBy: req.user._id
        },
        { upsert: true, new: true }
      );
    }
  }

  // 5. Send Welcome Email
  try {
    const company = await Company.findById(companyId);

    const welcomeHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F172A; padding: 40px; color: #FFFFFF;">
        <h2 style="color: #3b82f6; margin-bottom: 20px;">Welcome to the Team, ${user.name}!</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #CBD5E1;">Your account has been successfully created for <strong>${company?.name || 'Finch Force'}</strong>. You can now access your workspace and start your field activities.</p>
        
        <div style="background-color: #1E293B; padding: 25px; border-radius: 12px; margin: 30px 0; border: 1px solid rgba(59, 130, 246, 0.2);">
          <h3 style="color: #3b82f6; margin-top: 0; font-size: 18px;">Workspace Connection</h3>
          <p style="margin: 8px 0; font-size: 15px;"><strong>URL:</strong> <span style="color: #93C5FD; font-family: monospace;">${company?.webUrl}</span></p>
          <p style="margin: 8px 0; font-size: 15px;"><strong>Access Key:</strong> <span style="color: #93C5FD; font-family: monospace;">${company?.accessKey}</span></p>
        </div>

        <h3 style="color: #3b82f6; font-size: 18px;">Login Credentials</h3>
        <div style="background-color: #1E293B; padding: 20px; border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.1);">
          <p style="margin: 8px 0;"><strong>Employee Code:</strong> <span style="color: #F8FAFC;">${user.employeeId}</span></p>
          <p style="margin: 8px 0;"><strong>Initial Password:</strong> <span style="color: #F8FAFC;">${password}</span></p>
        </div>

        <p style="margin-top: 30px; font-size: 14px; color: #94A3B8;">Please use the Workspace URL and Access Key on the app startup screen to connect your device.</p>
        <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;" />
        <p style="text-align: center; color: #64748B; font-size: 12px;">© ${new Date().getFullYear()} ${company?.name || 'Finch Force'}. All rights reserved.</p>
      </div>
    `;

    await sendEmail(
      user.email,
      `Welcome to ${company?.name || 'Finch Force'} - Your Credentials`,
      welcomeHtml,
      company?.name
    );
  } catch (emailErr) {
    console.error("Welcome Email Error:", emailErr);
  }

  res.status(201).json({ success: true, message: "User created successfully", data: user });

  // 📝 Log Initial Status History
  await StatusHistory.create({
    userId: user._id,
    companyId,
    status: true,
    changedBy: req.user._id,
    reason: "Initial Account Creation"
  });

  // 🔔 Trigger Auto Group Addition (Background)
  addUserToGroups(user._id, companyId, user.managerId);
});

export const verifyOtpAndCreateUser = async (req, res) => {
  const { email, otp } = req.body;
  const companyId = req.user.companyId;

  const record = await UserCreateOtp.findOne({ email, companyId });

  if (!record) return res.status(400).json({ message: "OTP expired or invalid" });

  if (record.otpExpiresAt < new Date())
    return res.status(400).json({ message: "OTP expired" });

  const isValid = await bcrypt.compare(otp, record.otpHash);
  if (!isValid) return res.status(400).json({ message: "Invalid OTP" });

  const hashedPassword = await bcrypt.hash(record?.password, 10);

  const user = await User.create({
    companyId,
    name: record.name,
    email: record.email,
    mobile: record.mobile,
    employeeId: record.employeeId,
    designation: record.designation,
    roleId: record.roleId,
    password: hashedPassword,
    managerId: record.managerId,
    managerName: record.managerName,
    managerType: record.managerType,
    isVerified: true,
    createdBy: record.createdBy,
    stations: record.stations || [],
    subAreas: record.subAreas || [],
    dailyAllowance: record.dailyAllowance,
  });

  // Deployment Infrastructure already handled in User.create

  // 4. Create Monthly Targets (Multi-year support)
  if (record.targets && Array.isArray(record.targets) && record.targets.length > 0) {
    for (const yearData of record.targets) {
      if (!yearData.year) continue;
      await mongoose.model("MonthlyTarget").findOneAndUpdate(
        { userId: user._id, year: yearData.year },
        {
          companyId: user.companyId,
          targets: yearData.targets.map(t => ({
            month: t.month,
            target: Number(t.target) || 0
          })),
          createdBy: record.createdBy
        },
        { upsert: true, new: true }
      );
    }
  }

  await UserCreateOtp.deleteOne({ _id: record._id });

  // ── Dispatch Welcome Email ──
  try {
    const company = await Company.findById(companyId);

    const welcomeHtml = `
      <h2 style="color: #ffffff;">Welcome to the Team!</h2>
      <p>Hi ${user.name},</p>
      <p>Your account has been successfully created for <strong>${company?.name || 'Finch Force'}</strong>. You can now access your workspace and start your field activities.</p>
      
      <div style="background-color: #1f2937; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(59, 130, 246, 0.2);">
        <p style="margin: 5px 0;"><strong>Workspace URL:</strong> <span style="color: #3b82f6;">${company?.webUrl}</span></p>
        <p style="margin: 5px 0;"><strong>Access Key:</strong> <span style="color: #3b82f6;">${company?.accessKey}</span></p>
      </div>

      <p>Once connected, log in with your credentials:</p>
      <ul style="color: #d1d5db;">
        <li><strong>Employee Code:</strong> ${user.employeeId}</li>
        <li><strong>Password:</strong> ${record.password}</li>
      </ul>

      <p style="margin-top: 20px;">Use the Workspace URL and Access Key on the app startup screen to connect.</p>
    `;

    await sendEmail(
      user.email,
      `Welcome to ${company?.name || 'Finch Force'} - Your Credentials`,
      welcomeHtml,
      company?.name
    );
  } catch (emailErr) {
    console.error("Welcome Email Error:", emailErr);
  }

  res.json({ message: "User created successfully", user });

  // 🔔 Trigger Auto Group Addition (Background)
  addUserToGroups(user._id, user.companyId, user.managerId);
};

export const sendOtpForUserCreate = asyncHandler(async (req, res) => {
  const {
    name, email, mobile, employeeId, roleId, password,
    managerId, managerName, managerType,
    stations, subAreas,
    targets, designation, dailyAllowance, salaryRevisions
  } = req.body;
  console.log("req.body", req.body)
  const companyId = req.user.companyId;

  const exists = await User.findOne({ companyId, email });
  console.log("exists", exists)

  if (exists) return res.status(400).json({ message: "User already exists" });



  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  console.log("otpHash", otpHash)

  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await UserCreateOtp.deleteMany({ email, companyId });

  await UserCreateOtp.create({
    companyId,
    name,
    email,
    mobile,
    employeeId,
    roleId,
    password,
    managerId,
    managerName,
    managerType,
    otpHash,
    otpExpiresAt,
    otpExpiresAt,
    createdBy: req.user._id,
    stations: stations || [],
    subAreas: subAreas || [],
    targets,
    designation,
    dailyAllowance
  });

  const company = await Company.findById(companyId);

  try {
    await sendOtpEmail({
      to: email,
      name,
      otp,
      companyName: company?.name
    });
  } catch (err) {
    console.error("MAIL ERROR:", err);
    return res.status(500).json({ message: "Mail failed", error: err.message });
  }

  res.json({ message: "OTP sent successfully" });
});





export const getAccessibleUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const loggedUser = await User.findById(loggedInUserId)
      .populate("roleId")
      .populate({
        path: "managerId",
        populate: { path: "roleId" }
      });
    console.log("loggedUser:::::::::", loggedUser)
    if (!loggedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!loggedUser.isActive) {
      return res.status(403).json({ message: "User is inactive" });
    }

    const companyId = loggedUser.companyId;

    let baseLevel;
    if (loggedUser.managerId && loggedUser.managerId.roleId) {
      baseLevel = loggedUser.managerId.roleId.level;
    } else if (loggedUser.roleId) {
      baseLevel = loggedUser.roleId.level;
    } else {
      return res.status(400).json({ message: "Role not assigned properly" });
    }

    let roles;
    if (baseLevel === 1) {
      roles = await Role.find({ companyId });
    } else {
      roles = await Role.find({
        companyId,
        level: { $gt: baseLevel }
      });
    }

    const roleIds = roles.map(r => r._id);

    const users = await User.find({
      companyId,
      $or: [
        { roleId: { $in: roleIds } },
        { _id: loggedUser.managerId?._id }
      ],
      isActive: true,
      isVerified: true,
      _id: { $ne: loggedInUserId }
    })
      .select("_id name roleId managerId photo")
      .populate("roleId", "name level");


    if (!users.length) {
      return res.status(200).json([]);
    }

    return res.json(users);

  } catch (err) {
    console.error("getAccessibleUsers error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

// ─── Internal Helper: Aggregate Stats for IDs ──────────────────────────────────
const aggregateStatsForIds = async (allIds, companyId, start, end) => {
  const [callsData, clientsData, expensesData, leavesData] = await Promise.all([
    mongoose.model("ActivityLog").aggregate([
      { $match: { userId: { $in: allIds }, companyId, timestamp: { $gte: start, $lte: end } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } }
    ]),
    mongoose.model("Client").aggregate([
      { $match: { createdBy: { $in: allIds }, companyId, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$createdBy", count: { $sum: 1 } } }
    ]),
    mongoose.model("Expense").aggregate([
      { $unwind: "$days" },
      { $match: { userId: { $in: allIds }, companyId, "days.date": { $gte: start, $lte: end } } },
      { $group: { _id: "$userId", total: { $sum: "$days.totalAmount" } } }
    ]),
    mongoose.model("Leave").aggregate([
      { $match: { userId: { $in: allIds }, companyId, startDate: { $lte: end }, endDate: { $gte: start }, status: "Approved" } },
      { $group: { _id: "$userId", count: { $sum: 1 } } }
    ])
  ]);

  const statsMap = {};
  allIds.forEach(id => {
    statsMap[id.toString()] = { calls: 0, newClients: 0, expenses: 0, leaves: 0 };
  });

  callsData.forEach(d => { if (statsMap[d._id]) statsMap[d._id].calls = d.count; });
  clientsData.forEach(d => { if (statsMap[d._id]) statsMap[d._id].newClients = d.count; });
  expensesData.forEach(d => { if (statsMap[d._id]) statsMap[d._id].expenses = d.total; });
  leavesData.forEach(d => { if (statsMap[d._id]) statsMap[d._id].leaves = d.count; });

  return statsMap;
};

/**
 * @desc  Get user's entire reporting hierarchy (Self + all descendants) WITH STATS
 * @route GET /api/users/my-team
 */
export const getMyTeam = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const { startDate, endDate } = req.query;
    const companyId = req.user.companyId;

    const results = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(loggedInUserId) } },
      {
        $graphLookup: {
          from: "users",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "managerId",
          as: "descendants"
        }
      },
      {
        $project: {
          allIds: {
            $concatArrays: [["$_id"], "$descendants._id"]
          }
        }
      }
    ]);

    if (!results.length) return res.status(200).json([]);
    const allIds = results[0].allIds;

    // Prepare Dates
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    if (!startDate) start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const [statsMap, teamMembers] = await Promise.all([
      aggregateStatsForIds(allIds, companyId, start, end),
      User.find({
        _id: { $in: allIds },
        isVerified: true
      })
        .select("_id name roleId employeeId designation photo isActive managerId stations subAreas")
        .populate("roleId", "name level")
        .populate("managerId", "name")
        .sort({ name: 1 })
        .lean()
    ]);

    // Fetch Territories for all members
    const territoryMap = {};
    const territories = await Territory.find({
      employeeId: { $in: allIds },
      companyId
    }).lean();

    territories.forEach(t => {
      territoryMap[t.employeeId.toString()] = t;
    });

    const mergedTeam = teamMembers.map(m => ({
      ...m,
      stats: statsMap[m._id.toString()],
      territory: territoryMap[m._id.toString()]
    }));

    return res.json(mergedTeam);

  } catch (err) {
    console.error("getMyTeam error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/**
 * @desc Get any user's reporting team (used specifically by Admin Dashboard)
 * @route GET /api/users/team-by-id/:id
 */
export const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const companyId = req.user.companyId;

    let user = mongoose.isValidObjectId(id) ? await User.findById(id) : null;
    if (!user) {
      user = await User.findOne({ employeeId: id, companyId });
    }
    if (!user) return res.status(404).json({ message: "User not found" });

    const targetUserId = user._id;

    const hierarchy = await User.aggregate([
      { $match: { _id: targetUserId } },
      {
        $graphLookup: {
          from: "users",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "managerId",
          as: "descendants"
        }
      },
      {
        $project: {
          allIds: {
            $concatArrays: [["$_id"], "$descendants._id"]
          }
        }
      }
    ]);

    if (!hierarchy.length) return res.status(200).json([]);
    const allIds = hierarchy[0].allIds;

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    if (!startDate) start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const [statsMap, teamMembers] = await Promise.all([
      aggregateStatsForIds(allIds, companyId, start, end),
      User.find({
        _id: { $in: allIds },
        isVerified: true
      })
        .select("_id name roleId employeeId designation photo isActive managerId stations subAreas")
        .populate("roleId", "name level")
        .populate("managerId", "name")
        .sort({ name: 1 })
        .lean()
    ]);

    // Fetch Territories for all members
    const territoryMap = {};
    const territories = await Territory.find({
      employeeId: { $in: allIds },
      companyId
    }).lean();

    territories.forEach(t => {
      territoryMap[t.employeeId.toString()] = t;
    });

    const mergedTeam = teamMembers.map(m => ({
      ...m,
      stats: statsMap[m._id.toString()],
      territory: territoryMap[m._id.toString()]
    }));

    return res.json(mergedTeam);

  } catch (err) {
    console.error("getTeamById error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

// ─── Admin: Get All Users ─────────────────────────────────────────────────────
export const getAllUsers = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { search, roleId, isActive, page = 1, limit = 50 } = req.query;

  const filter = { companyId };
  if (roleId) filter.roleId = roleId;
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (search) filter.$or = [
    { name: { $regex: search, $options: "i" } },
    { employeeId: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } }
  ];

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    User.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .select("-password -passwordHistory -otp -otpExpiresAt")
      .populate("roleId", "name level")
      .populate("managerId", "name employeeId"),
    User.countDocuments(filter)
  ]);

  res.json({ success: true, data: { users, total, page: Number(page), limit: Number(limit) } });
});

// ─── Admin: Get User By ID ────────────────────────────────────────────────────
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, companyId: req.user.companyId })
    .select("-password -passwordHistory -otp -otpExpiresAt")
    .populate("roleId", "name level permissions")
    .populate("managerId", "name employeeId");

  if (!user) return res.status(404).json({ message: "User not found" });

  // 💎 Fetch Associated Records
  const [compDoc, targets, territory] = await Promise.all([
    mongoose.model("Compensation").findOne({ userId: user._id }),
    mongoose.model("MonthlyTarget").find({ userId: user._id }).sort({ year: -1 }),
    mongoose.model("Territory").findOne({ employeeId: user._id })
  ]);

  let salaryRevisions = [];
  if (compDoc) {
    if (compDoc.current) salaryRevisions.push(compDoc.current);
    if (compDoc.history) salaryRevisions.push(...compDoc.history);
  }
  salaryRevisions.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  res.json({
    success: true,
    data: {
      ...user._doc,
      salaryRevisions,
      targets,
      territory
    }
  });
});

// ─── Admin: Edit User ─────────────────────────────────────────────────────────
export const editUser = asyncHandler(async (req, res) => {
  const {
    name, email, mobile, roleId, managerId, managerType,
    isActive, employeeId, designation, dailyAllowance,
    salaryRevisions, targets, stations, subAreas, joiningDate
  } = req.body;

  const user = await User.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!user) return res.status(404).json({ message: "User not found" });

  if (name) user.name = name;
  if (email) user.email = email.toLowerCase();
  if (mobile !== undefined) user.mobile = mobile;
  if (roleId) user.roleId = roleId;
  if (managerId !== undefined) user.managerId = managerId || null;
  if (managerType) user.managerType = managerType;
  if (typeof isActive === "boolean") user.isActive = isActive;
  if (employeeId) user.employeeId = employeeId;
  if (designation) user.designation = designation;
  if (dailyAllowance !== undefined) user.dailyAllowance = dailyAllowance;
  if (stations) user.stations = stations;
  if (subAreas) user.subAreas = subAreas;
  if (joiningDate) user.joiningDate = joiningDate;

  await user.save();

  // 💎 Save Salary Revisions
  if (salaryRevisions) {
    await saveSalaryRevisions(user._id, req.user.companyId, salaryRevisions, req.user._id);
  }

  // 🎯 Save Targets
  if (targets && Array.isArray(targets)) {
    for (const yearData of targets) {
      if (!yearData.year) continue;
      await mongoose.model("MonthlyTarget").findOneAndUpdate(
        { userId: user._id, year: yearData.year },
        {
          companyId: req.user.companyId,
          targets: yearData.targets.map(t => ({
            month: t.month,
            target: Number(t.target) || 0
          })),
          createdBy: req.user._id
        },
        { upsert: true, new: true }
      );
    }
  }

  const updated = await User.findById(user._id)
    .select("-password -passwordHistory -otp -otpExpiresAt")
    .populate("roleId", "name level")
    .populate("managerId", "name employeeId");

  res.json({ success: true, message: "User updated", data: updated });
});

// ─── Admin: Delete (Deactivate) User ─────────────────────────────────────────
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!user) return res.status(404).json({ message: "User not found" });

  user.isActive = false;
  await user.save();

  res.json({ success: true, message: "User deactivated successfully" });
});

// ─── User: Update FCM Token ─────────────────────────────────────────
export const updateFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, "Token required");

  // 1. Remove this token from ANY other user record (Ensures 1 device = 1 user)
  // This is the critical fix for shared devices where multiple users log in
  await User.updateMany(
    { fcmTokens: token, _id: { $ne: req.user._id } },
    { $pull: { fcmTokens: token } }
  );

  // 2. Add token to current user if it doesn't exist
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { fcmTokens: token }
  });

  res.json({ success: true, message: "Token updated and exclusivity ensured" });
});

/**
 * 🔐 Remove FCM Token (on Logout)
 */
export const removeFcmToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, "Token required");

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { fcmTokens: token }
  });

  res.json({ success: true, message: "Token removed successfully" });
});

// ─── User: Upload Profile Photo ─────────────────────────────────────────
export const uploadProfilePhoto = asyncHandler(async (req, res) => {
  const file = req.file;
  console.log("Profile Photo Upload - Incoming File:", file);
  if (!file) {
    throw new ApiError(400, "No photo uploaded");
  }

  // TODO: Add AWS S3 upload logic here
  // const s3Result = await s3Upload(file);
  // const photoUrl = s3Result.Location;

  // Storing photo directly in public/uploads for now
  const photoUrl = `/uploads/profiles/${file.filename}`;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { photo: photoUrl },
    { new: true }
  ).select("-password -passwordHistory -otp -otpExpiresAt")
    .populate("roleId", "name level")
    .populate("managerId", "name employeeId");

  res.json({ success: true, message: "Profile photo updated", data: updatedUser });
});

/**
 * ?? Get Detailed Profile Analytics for a User
 */
export const getUserProfileStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;
  const companyId = req.user.companyId;

  if (!startDate || !endDate) {
    throw new ApiError(400, "Date range (startDate, endDate) is required");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const User = mongoose.model("User");
  let user = mongoose.isValidObjectId(id) ? await User.findById(id) : null;
  if (!user) {
    user = await User.findOne({ employeeId: id, companyId });
  }

  if (!user) {
    return res.status(200).json({
      success: true,
      data: { stats: { calls: 0, newClients: 0, listed: 0, unlisted: 0, expenses: 0, leaves: 0 }, sales: { achieved: "₹0L", target: "₹0L", percent: 0 }, interactionTrend: [] }
    });
  }

  const userIdObj = user._id;

  // 1. Core Summary Stats & Client Breakdown
  const [calls, clientsCount, expenses, leaves, clientStats] = await Promise.all([
    mongoose.model("ActivityLog").countDocuments({ userId: userIdObj, companyId, timestamp: { $gte: start, $lte: end } }),
    mongoose.model("Client").countDocuments({ createdBy: userIdObj, companyId, createdAt: { $gte: start, $lte: end } }),
    mongoose.model("Expense").aggregate([
      { $unwind: "$days" },
      { $match: { userId: userIdObj, companyId, "days.date": { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$days.totalAmount" } } }
    ]),
    mongoose.model("Leave").countDocuments({
      userId: userIdObj,
      companyId,
      startDate: { $lte: end },
      endDate: { $gte: start },
      status: "Approved"
    }),
    mongoose.model("Client").aggregate([
      { $match: { createdBy: userIdObj, companyId, createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          listedActive: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "L"] }, { $eq: ["$status", "active"] }] }, 1, 0] } },
          listedInactive: { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "L"] }, { $ne: ["$status", "active"] }] }, 1, 0] } },
          unlisted: { $sum: { $cond: [{ $ne: ["$priority", "L"] }, 1, 0] } }
        }
      }
    ])
  ]);

  // 2. Performance Achievement (Current Year Logic)
  const yearNum = start.getFullYear();
  const [targetDoc, achieveDoc] = await Promise.all([
    mongoose.model("MonthlyTarget").findOne({ userId: userIdObj, year: yearNum }),
    mongoose.model("MonthlyAchievement").findOne({ userId: userIdObj, year: yearNum })
  ]);

  // Sum up achievement for months within range
  const monthsInRange = [];
  let current = new Date(start);
  while (current <= end) {
    monthsInRange.push(current.toLocaleString("default", { month: "long" }));
    current.setMonth(current.getMonth() + 1);
    if (monthsInRange.length > 12) break;
  }

  let totalTarget = 0;
  let totalAchieved = 0;

  if (targetDoc) {
    totalTarget = targetDoc.targets
      .filter(t => monthsInRange.includes(t.month))
      .reduce((sum, t) => sum + (t.target || 0), 0);
  }

  if (achieveDoc) {
    totalAchieved = achieveDoc.achievements
      .filter(a => monthsInRange.includes(a.month))
      .reduce((sum, a) => sum + (a.achievement || 0), 0);
  }

  const percent = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

  // 3. Interaction Trend (Current Year Monthly Breakdown)
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  const trends = await mongoose.model("ActivityLog").aggregate([
    {
      $match: {
        userId: userIdObj,
        companyId: new mongoose.Types.ObjectId(companyId),
        timestamp: { $gte: yearStart, $lte: yearEnd }
      }
    },
    {
      $group: {
        _id: { $month: "$timestamp" },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Map to 12 months (1-12)
  const monthlyTrend = Array(12).fill(0);
  trends.forEach(t => {
    if (t._id >= 1 && t._id <= 12) {
      monthlyTrend[t._id - 1] = t.count;
    }
  });

  res.json({
    success: true,
    data: {
      user: {
        name: user.name,
        employeeId: user.employeeId,
        designation: user.roleId?.name || user.designation || "Personnel",
        manager: user.managerId?.name || "N/A",
        email: user.email,
        photo: user.photo,
        id: user._id
      },
      stats: {
        calls,
        newClients: clientsCount,
        listedActive: clientStats[0]?.listedActive || 0,
        listedInactive: clientStats[0]?.listedInactive || 0,
        unlisted: clientStats[0]?.unlisted || 0,
        expenses: expenses[0]?.total || 0,
        leaves
      },
      sales: {
        achieved: `₹${(totalAchieved / 100000).toFixed(1)}L`,
        target: `₹${(totalTarget / 100000).toFixed(1)}L`,
        percent
      },
      interactionTrend: monthlyTrend
    }
  });
});
/**
 * 🗺️ Sync User Location (Intelligent Update)
 */
export const syncLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;
  const companyId = req.user.companyId;

  if (!latitude || !longitude) {
    throw new ApiError(400, "Coordinates (lat/long) are required");
  }

  // Basic Sanity Check
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new ApiError(400, "Invalid coordinates");
  }

  const updatedUser = await mongoose.model("User").findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        "lastLocation.latitude": latitude,
        "lastLocation.longitude": longitude,
        "lastLocation.updatedAt": new Date(),
        isOnline: true,
        lastActiveAt: new Date()
      }
    },
    { new: true }
  ).select("_id name lastLocation");

  res.json({
    success: true,
    message: "Location synchronized",
    data: {
      latitude: updatedUser.lastLocation.latitude,
      longitude: updatedUser.lastLocation.longitude,
      updatedAt: updatedUser.lastLocation.updatedAt
    }
  });
});
/**
 * 🗺️ Get Live Fleet Locations (for Admin Map)
 */
export const getLiveFleet = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const ONLINE_TIMEOUT = 2 * 60 * 1000; // 2 minutes
  const now = new Date();

  const users = await mongoose.model("User").find({
    companyId,
    isActive: true,
    lastLocation: { $exists: true }
  })
    .select("name employeeId lastLocation isOnline lastActiveAt photo designation")
    .populate("roleId", "name");

  res.json({
    success: true,
    count: users.length,
    data: await Promise.all(users.map(async u => {
      // Dynamic online check
      const lastActive = u.lastActiveAt || u.lastLocation?.updatedAt || new Date(0);
      const isActuallyOnline = u.isOnline && (now.getTime() - new Date(lastActive).getTime() < ONLINE_TIMEOUT);

      // Check if today's plan is submitted for this user
      const todayStart = new Date(now);
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setUTCHours(23, 59, 59, 999);
      const todayPlan = await mongoose.model("DayPlan").findOne({
        userId: u._id,
        date: { $gte: todayStart, $lte: todayEnd }
      });

      const idleThreshold = 5 * 60 * 1000; // 5 minutes
      const idleTime = u.lastMovementAt ? (now.getTime() - new Date(u.lastMovementAt).getTime()) : 0;

      return {
        id: u._id,
        name: u.name,
        employeeId: u.employeeId,
        designation: u.roleId?.name || u.designation,
        coordinates: {
          latitude: u.lastLocation.latitude,
          longitude: u.lastLocation.longitude,
        },
        lastSeen: u.lastLocation.updatedAt,
        isOnline: isActuallyOnline,
        hasDayPlan: !!todayPlan,
        lastMovementAt: u.lastMovementAt,
        isIdle: isActuallyOnline && idleTime > idleThreshold,
        idleDuration: idleTime,
        photo: u.photo
      };
    }))
  });
});

/**
 * 🔄 Toggle User Active Status
 */
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  const companyId = req.user.companyId;

  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "isActive (boolean) is required");
  }

  const User = mongoose.model("User");
  let user = mongoose.isValidObjectId(id) ? await User.findById(id) : null;
  if (!user) {
    user = await User.findOne({ employeeId: id, companyId });
  }

  if (!user) throw new ApiError(404, "User not found");

  user.isActive = isActive;
  await user.save();

  // 📝 Log Status History
  await StatusHistory.create({
    userId: user._id,
    companyId,
    status: isActive,
    changedBy: req.user._id,
    reason: req.body.reason || "Administrative Toggle"
  });

  res.json({
    success: true,
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: {
      id: user._id,
      employeeId: user.employeeId,
      isActive: user.isActive
    }
  });
});
