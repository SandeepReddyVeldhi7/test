import asyncHandler from "../../utils/asyncHandler.js";
import Compensation from "../../models/Compensation.model.js";
import mongoose from "mongoose";

// @desc    Get payroll overview for admin
// @route   GET /api/payroll/admin-overview
// @access  Private/Admin
export const getAdminPayrollOverview = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const { startDate, endDate } = req.query; // Used to filter effective month if needed

  // For payroll, we look at current active compensations
  const result = await Compensation.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
    {
      $facet: {
        total: [{ $group: { _id: null, sum: { $sum: "$current.totalAmount" } } }],
        breakdown: [
          { $unwind: "$current.components" },
          { $group: { _id: "$current.components.label", value: { $sum: "$current.components.value" } } },
          { $sort: { value: -1 } },
          { $limit: 2 }
        ]
      }
    }
  ]);

  const totalSum = result[0].total[0]?.sum || 0;
  const topComponents = result[0].breakdown || [];

  const categories = [
    { label: "ORG_TOTAL", value: totalSum },
    { label: "BASIC", value: topComponents[0]?.value || 0, name: topComponents[0]?._id || "Basic Salary" },
    { label: "ALLOWANCE", value: topComponents[1]?.value || 0, name: topComponents[1]?._id || "Other Allowances" }
  ];

  res.json({
    success: true,
    data: {
      categories,
      summary: { total: totalSum }
    }
  });
});

// @desc    Get all member payrolls
// @route   GET /api/payroll/admin-list
// @access  Private/Admin
export const getAdminPayrollList = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;

  const payrolls = await Compensation.find({ companyId })
    .populate("userId", "name employeeId roleId")
    .sort({ "current.totalAmount": -1 });

  const summary = payrolls.map(p => ({
    _id: p._id,
    userId: p.userId?._id,
    name: p.userId?.name || "Member",
    employeeId: p.userId?.employeeId,
    detail: `${p.current?.designation} — Effective ${p.current?.effectiveFrom}`,
    amount: `₹${(p.current?.totalAmount || 0).toLocaleString('en-IN')}`,
    category: "PAYROLL",
    status: p.current?.isLocked ? "LOCKED" : "DRAFT",
    avatar: p.userId?.name?.charAt(0) || "?",
    avatarBg: "#1e293b",
    components: p.current?.components || []
  }));

  res.json({
    success: true,
    data: summary
  });
});
