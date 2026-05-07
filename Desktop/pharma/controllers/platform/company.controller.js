import mongoose from "mongoose";
import Company from "../../models/Company.model.js";
import User from "../../models/User.model.js";
import Plan from "../../models/Plan.model.js";
import DCR from "../../models/DCR.model.js";
import Expense from "../../models/Expense.model.js";
import ToDo from "../../models/ToDo.model.js";
import ActivityLog from "../../models/ActivityLog.model.js";
import Client from "../../models/Client.model.js";
import Complaint from "../../models/Complaint.model.js";
import Bill from "../../models/Bill.model.js";
import Counter from "../../models/Counter.model.js";
import Role from "../../models/Role.model.js";
import BillingEntity from "../../models/BillingEntity.model.js";
import DashboardUser from "../../models/DashboardUser.model.js";
import DashboardRole from "../../models/DashboardRole.model.js";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { sendWelcomeEmail } from "../../services/email.service.js";
import { generateInvoicePDF } from "../../services/pdf.service.js";
import bcrypt from "bcryptjs";

// @desc    Get all companies with stats and pagination
// @route   GET /api/platform/companies
export const getAllCompanies = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Use aggregate to get company details + user counts in one go
  const companies = await Company.aggregate([
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "companyId",
        as: "users"
      }
    },
    {
      $lookup: {
        from: "plans",
        localField: "plan",
        foreignField: "_id",
        as: "planDetails"
      }
    },
    {
      $project: {
        name: 1,
        code: 1,
        status: 1,
        createdAt: 1,
        maxUsers: 1,
        logoUrl: 1,
        plan: { $arrayElemAt: ["$planDetails", 0] },
        userCount: { $size: "$users" }
      }
    }
  ]);

  const total = await Company.countDocuments();

  res.status(200).json({
    success: true,
    count: companies.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    data: companies
  });
});

// @desc    Get single company details with users and plans
// @route   GET /api/platform/companies/:id
export const getCompanyDetails = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id)
    .populate("plan")
    .populate("createdBy", "name email");

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  // Get users for this company
  const users = await User.find({ companyId: company._id })
    .select("name email roleId designation isActive lastLoginAt lastActiveAt")
    .populate("roleId", "name")
    .limit(100);

  // 💰 Calculate Total Lifetime Revenue (only PAID bills)
  const revenueData = await Bill.aggregate([
    { $match: { companyId: company._id, paymentStatus: "PAID" } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } }
  ]);
  const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

  res.status(200).json({
    success: true,
    data: {
      company,
      users,
      userCount: await User.countDocuments({ companyId: company._id }),
      totalRevenue
    }
  });
});

// @desc    Onboard a new organization (Create Company + Initial Bill)
// @route   POST /api/platform/companies/onboard
export const onboardCompany = asyncHandler(async (req, res) => {
  const { 
    name, code, industry, contactEmail, phoneNumber, orgType, address,
    planId, billingCycle, userCount, startDate, 
    additionalCharges = 0, discountPercentage = 0, taxRate = 18,
    billingEntityId, gstId,
    adminName, adminEmail, adminEmpId, adminMobile, adminPassword
  } = req.body;

  if (!name || !code || !planId || !userCount || !startDate || !billingEntityId || !adminEmail || !adminName) {
    throw new ApiError(400, "Company details and Admin details (Name/Email) are required");
  }

  // 1. Validate Plan
  const plan = await Plan.findById(planId);
  if (!plan) throw new ApiError(404, "Plan not found");

  // 2. Calculate Expiry Date
  const start = new Date(startDate);
  const end = new Date(startDate);
  const months = billingCycle === "Yearly" ? 12 : 1;
  end.setMonth(end.getMonth() + months);

  // 3. Financial Calculations
  const basePrice = plan.price || 0;
  const cycleDiscount = billingCycle === "Yearly" ? 0.8 : 1; // 20% off for yearly
  const unitPrice = Math.floor(basePrice * cycleDiscount);
  const subscriptionAmount = unitPrice * userCount * months;

  const subtotal = subscriptionAmount + Number(additionalCharges);
  const discountAmount = (subtotal * Number(discountPercentage)) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = Math.floor(taxableAmount * (Number(taxRate) / 100));
  const totalFinal = taxableAmount + taxAmount;

  // 4. Generate Workspace Credentials (Robust Edge Case Handling)
  const nameClean = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const namePrefix = nameClean.length >= 4 ? nameClean.substring(0, 4) : nameClean.padEnd(4, "F"); // Pad with 'F' (Finch) if too short
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  
  const workspaceAccessKey = `${namePrefix}-${randomDigits}`;
  
  // Sanitized name for URL (lowercase, alphanumeric only)
  let urlSlug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  // If name is too short or contains only symbols, fallback to name + code
  if (urlSlug.length < 3) {
    urlSlug = (urlSlug + code.toLowerCase()).substring(0, 10);
  }
  const workspaceWebUrl = `${urlSlug}.finchforce.com`;

  // 4. Create Company
  const company = await Company.create({
    name,
    code: code.toUpperCase(),
    industry,
    contactEmail,
    phoneNumber,
    orgType,
    address,
    gstId,
    plan: planId,
    webUrl: workspaceWebUrl,
    accessKey: workspaceAccessKey,
    maxUsers: userCount,
    subscription: {
      billingCycle,
      startDate: start,
      expiryDate: end,
      months,
      userCount,
      status: "ACTIVE"
    },
    createdBy: req.user._id
  });

  // 5. Create Initial Bill
  const invoiceNumber = await Counter.getNextInvoiceNumber();
  const bill = await Bill.create({
    companyId: company._id,
    billingEntityId,
    invoiceNumber,
    invoiceDate: new Date(),
    type: "INITIAL",
    subscriptionPeriod: {
      start,
      end,
      months
    },
    planSnapshot: {
      planId: plan._id,
      planName: plan.name,
      pricePerUser: unitPrice,
      billingCycle
    },
    userCount,
    lineItems: [
      {
        description: `${plan.name} Subscription (${userCount} users × ${months} months)`,
        quantity: userCount,
        unitPrice,
        amount: subscriptionAmount,
        itemType: "SUBSCRIPTION"
      }
    ],
    subtotal,
    additionalCharges: Number(additionalCharges),
    discount: {
      type: "PERCENTAGE",
      value: Number(discountPercentage),
      amount: discountAmount
    },
    taxBreakdown: {
      taxType: "GST",
      rate: Number(taxRate),
      amount: taxAmount
    },
    taxableAmount,
    totalAmount: totalFinal,
    currency: "INR",
    paymentStatus: "PENDING",
    status: "FINALIZED",
    gstId,
    createdBy: req.user._id
  });

  // 6. Fetch Billing Entity for Invoice Professionalism
  console.log(`🔍 Fetching Billing Entity with ID: ${billingEntityId}`);
  const billingEntity = await BillingEntity.findById(billingEntityId);
  if (!billingEntity) {
    console.error(`❌ Billing Entity not found for ID: ${billingEntityId}`);
    throw new ApiError(404, "Billing Entity not found");
  }

  // 7. Create Default SUPER_ADMIN Role for the new company
  const superAdminRole = await Role.create({
    companyId: company._id,
    name: "SUPER_ADMIN",
    level: 1,
    permissions: [
      "MANAGE_COMPANY", "MANAGE_USERS", "MANAGE_ROLES", 
      "VIEW_REPORTS", "MANAGE_BILLING", "MANAGE_SETTINGS",
      "CREATE_USER", "UPDATE_USER", "DELETE_USER",
      "VIEW_DASHBOARD"
    ]
  });

  // 7. Create Super Admin User
  const hashedPassword = await bcrypt.hash(adminPassword || ("Finch@" + code.toUpperCase() + "@2026"), 10);
  const adminUser = await User.create({
    companyId: company._id,
    name: adminName,
    email: adminEmail,
    employeeId: adminEmpId || `ADM-${code.toUpperCase()}-001`,
    mobile: adminMobile,
    roleId: superAdminRole._id,
    password: hashedPassword,
    isVerified: true,
    isActive: true,
    createdBy: req.user._id
  });

  // 8. Provision Dashboard Role and User for Admin (Multi-tenant)
  const dashboardRole = await DashboardRole.create({
    companyId: company._id,
    name: "SUPER_ADMIN",
    permissions: ["Dashboard", "Analytics", "Administration", "Finance", "Dashboard Users"]
  });

  await DashboardUser.create({
    companyId: company._id,
    name: adminName,
    email: adminEmail,
    employeeId: adminUser.employeeId,
    password: hashedPassword,
    roleId: dashboardRole._id
  });

  // 9. Update company with last invoice and admin
  company.subscription.lastInvoiceId = bill._id;
  await company.save();

  // 9. Generate Invoice PDF and Send Welcome Email
  try {
    console.log(`📄 Generating Invoice PDF for ${company.name} (Invoice: ${bill.invoiceNumber})...`);
    const pdfBase64 = await generateInvoicePDF(bill, company, billingEntity);
    
    const recipients = [adminEmail];
    if (company.contactEmail && company.contactEmail !== adminEmail) {
      recipients.push(company.contactEmail);
    }

    await sendWelcomeEmail({
      to: recipients,
      name: adminName,
      orgName: company.name,
      password: adminPassword || ("Finch@" + code.toUpperCase() + "@2026"),
      webUrl: `https://${company.webUrl}`,
      accessKey: company.accessKey,
      empCode: adminUser.employeeId,
      logo: billingEntity.logo,
      attachments: [
        {
          content: pdfBase64,
          name: `Invoice_${bill.invoiceNumber}.pdf`,
          type: "application/pdf"
        }
      ]
    });
  } catch (emailErr) {
    console.error("Failed to send welcome email:", emailErr.message);
    // We don't throw here to avoid failing the whole transaction since DB is already updated
  }

  res.status(201).json({
    success: true,
    message: "Organization onboarded successfully",
    data: { 
      company, 
      bill, 
      admin: {
        name: adminUser.name,
        email: adminUser.email,
        tempPassword: adminPassword || ("Finch@" + code.toUpperCase() + "@2026")
      }
    }
  });
});

// @desc    Toggle company status (ACTIVE/SUSPENDED)
// @route   PATCH /api/platform/companies/:id/toggle-status
export const toggleCompanyStatus = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  company.status = company.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  await company.save();

  res.status(200).json({
    success: true,
    status: company.status
  });
});

// @desc    Get detailed user insights (Activities, DCRs, Expenses)
// @route   GET /api/platform/companies/:id/users/:userId
export const getUserInsights = asyncHandler(async (req, res) => {
  const { id: companyId, userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }

  const user = await User.findOne({ _id: userId, companyId }).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found in this organization");
  }

  // Aggregate stats
  try {
    const userObjId = new mongoose.Types.ObjectId(userId);
    
    const [dcrCount, expenseCount, taskCount, allClients, complaints] = await Promise.all([
      DCR.countDocuments({ userId: userObjId }),
      Expense.countDocuments({ userId: userObjId }),
      ToDo.countDocuments({ userId: userObjId }),
      Client.find({ 
        $or: [
          { employeeId: userObjId },
          { employeeId: userId }
        ]
      }),
      Complaint.find({ userId: userObjId }).sort({ createdAt: -1 }).limit(10)
    ]);

    const clients = {
      total: allClients.length,
      listedActive: 0,
      listedInactive: 0,
      unlisted: 0
    };

    allClients.forEach(c => {
      const priority = (c.priority || '').toString().trim().toUpperCase();
      const status = (c.status || '').toString().trim().toLowerCase();

      if (priority === 'L') {
        if (status === 'active') clients.listedActive++;
        else if (status === 'inactive') clients.listedInactive++;
      } else if (priority === 'UL') {
        clients.unlisted++;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          totalDcrs: dcrCount,
          totalExpenses: expenseCount,
          totalTasks: taskCount,
          clients
        },
        complaints
      }
    });
  } catch (error) {
    console.error("Error in getUserInsights aggregation:", error);
    throw new ApiError(500, error.message || "Failed to aggregate user stats");
  }
});

// @desc    Get all bills for a company
// @route   GET /api/platform/companies/:id/bills
export const getCompanyBills = asyncHandler(async (req, res) => {
  const companyId = req.params.id;
  const bills = await Bill.find({ companyId })
    .sort({ invoiceDate: -1 })
    .populate("planSnapshot.planId", "name");

  res.status(200).json({
    success: true,
    data: bills
  });
});

// @desc    Renew a company's subscription
// @route   POST /api/platform/companies/:id/renew
export const renewSubscription = asyncHandler(async (req, res) => {
  const companyId = req.params.id;
  const { months, additionalCharges = 0, discountPercentage = 0, taxRate = 18 } = req.body;

  if (!months) {
    throw new ApiError(400, "Number of months is required");
  }

  const company = await Company.findById(companyId).populate("plan");
  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  // Get the latest bill to link it
  const latestBill = await Bill.findOne({ companyId }).sort({ invoiceDate: -1 });

  const plan = company.plan;
  const userCount = company.subscription.userCount || company.maxUsers || 10;
  
  // Calculate dates
  const startDate = new Date();
  const expiryDate = company.subscription.expiryDate && company.subscription.expiryDate > new Date() 
    ? new Date(company.subscription.expiryDate) 
    : new Date();
  
  expiryDate.setMonth(expiryDate.getMonth() + Number(months));

  // Financial calculations
  const basePrice = plan.price || 0;
  const billingCycleDiscount = months >= 12 ? 0.8 : 1;
  const unitPrice = Math.floor(basePrice * billingCycleDiscount);
  const subscriptionAmount = unitPrice * userCount * months;

  const lineItems = [
    {
      description: `${plan.name} Subscription Renewal (${userCount} users × ${months} months)`,
      quantity: userCount,
      unitPrice,
      amount: subscriptionAmount,
      itemType: "SUBSCRIPTION"
    }
  ];

  if (Number(additionalCharges) > 0) {
    lineItems.push({
      description: "Additional Charges",
      quantity: 1,
      unitPrice: Number(additionalCharges),
      amount: Number(additionalCharges),
      itemType: "OTHER"
    });
  }

  const subtotal = subscriptionAmount + Number(additionalCharges);
  const discountAmount = (subtotal * Number(discountPercentage)) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = Math.floor(taxableAmount * (Number(taxRate) / 100));
  const totalFinal = taxableAmount + taxAmount;

  const invoiceNumber = await Counter.getNextInvoiceNumber();

  // Create new bill
  const newBill = await Bill.create({
    companyId,
    invoiceNumber,
    invoiceDate: startDate,
    type: "RENEWAL",
    previousBillId: latestBill ? latestBill._id : null,
    subscriptionPeriod: {
      start: startDate,
      end: expiryDate,
      months: Number(months)
    },
    planSnapshot: {
      planId: plan._id,
      planName: plan.name,
      pricePerUser: unitPrice,
      billingCycle: months >= 12 ? "Yearly" : "Monthly"
    },
    userCount,
    lineItems,
    subtotal,
    additionalCharges: Number(additionalCharges),
    discount: {
      type: "PERCENTAGE",
      value: Number(discountPercentage),
      amount: discountAmount
    },
    taxBreakdown: {
      taxType: "GST",
      rate: Number(taxRate),
      amount: taxAmount
    },
    taxableAmount,
    totalAmount: totalFinal,
    currency: "INR",
    paymentStatus: "PENDING",
    status: "FINALIZED",
    notes: `Subscription renewed for ${months} months`,
    gstId: company.gstId,
    createdBy: req.user.id
  });

  // Update company subscription
  company.subscription.expiryDate = expiryDate;
  company.subscription.months = Number(months);
  company.subscription.status = "ACTIVE";
  company.subscription.lastInvoiceId = newBill._id;
  company.status = "ACTIVE";
  await company.save();

  res.status(200).json({
    success: true,
    message: "Subscription renewed successfully",
    data: {
      company,
      bill: newBill
    }
  });
});

// @desc    Upgrade a company's subscription (Plan or User Count)
// @route   POST /api/platform/companies/:id/upgrade
export const upgradeSubscription = asyncHandler(async (req, res) => {
  const companyId = req.params.id;
  const { planId, userCount, additionalCharges = 0, discountPercentage = 0, taxRate = 18 } = req.body;

  if (!planId || !userCount) {
    throw new ApiError(400, "Plan ID and User Count are required");
  }

  const company = await Company.findById(companyId);
  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const newPlan = await Plan.findById(planId);
  if (!newPlan) {
    throw new ApiError(404, "Selected plan not found");
  }

  const latestBill = await Bill.findOne({ companyId }).sort({ invoiceDate: -1 });

  // Assume upgrading starts a new billing cycle of 1 month for simplicity, or keeps existing expiry.
  // For this implementation, let's keep the existing expiryDate but charge for the new plan/users for 1 month.
  const startDate = new Date();
  const expiryDate = company.subscription.expiryDate && company.subscription.expiryDate > new Date() 
    ? new Date(company.subscription.expiryDate) 
    : new Date(new Date().setMonth(new Date().getMonth() + 1));
  
  // Calculate remaining days (simplified prorating logic can be added later)
  const months = 1;

  const basePrice = newPlan.price || 0;
  const unitPrice = basePrice;
  const subscriptionAmount = unitPrice * userCount * months;

  const lineItems = [
    {
      description: `Upgrade to ${newPlan.name} (${userCount} users)`,
      quantity: userCount,
      unitPrice,
      amount: subscriptionAmount,
      itemType: "UPGRADE"
    }
  ];

  if (Number(additionalCharges) > 0) {
    lineItems.push({
      description: "Upgrade/Setup Charges",
      quantity: 1,
      unitPrice: Number(additionalCharges),
      amount: Number(additionalCharges),
      itemType: "OTHER"
    });
  }

  const subtotal = subscriptionAmount + Number(additionalCharges);
  const discountAmount = (subtotal * Number(discountPercentage)) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = Math.floor(taxableAmount * (Number(taxRate) / 100));
  const totalFinal = taxableAmount + taxAmount;

  const invoiceNumber = await Counter.getNextInvoiceNumber();

  const newBill = await Bill.create({
    companyId,
    invoiceNumber,
    invoiceDate: startDate,
    type: "UPGRADE",
    previousBillId: latestBill ? latestBill._id : null,
    subscriptionPeriod: {
      start: startDate,
      end: expiryDate,
      months
    },
    gstId: company.gstId,
    planSnapshot: {
      planId: newPlan._id,
      planName: newPlan.name,
      pricePerUser: unitPrice,
      billingCycle: "Monthly"
    },
    userCount,
    lineItems,
    subtotal,
    additionalCharges: Number(additionalCharges),
    discount: {
      type: "PERCENTAGE",
      value: Number(discountPercentage),
      amount: discountAmount
    },
    taxBreakdown: {
      taxType: "GST",
      rate: Number(taxRate),
      amount: taxAmount
    },
    taxableAmount,
    totalAmount: totalFinal,
    currency: "INR",
    paymentStatus: "PENDING",
    status: "FINALIZED",
    notes: `Upgraded to ${newPlan.name} with ${userCount} users`,
    createdBy: req.user.id
  });

  // Update company
  company.plan = newPlan._id;
  company.maxUsers = userCount;
  company.subscription.plan = newPlan._id;
  company.subscription.userCount = userCount;
  company.subscription.expiryDate = expiryDate;
  company.subscription.status = "ACTIVE";
  company.subscription.lastInvoiceId = newBill._id;
  company.status = "ACTIVE";
  await company.save();

  res.status(200).json({
    success: true,
    message: "Subscription upgraded successfully",
    data: {
      company,
      bill: newBill
    }
  });
});

// @desc    Grant a free trial or free months
// @route   POST /api/platform/companies/:id/free-trial
export const grantFreeTrial = asyncHandler(async (req, res) => {
  const companyId = req.params.id;
  const { months, notes } = req.body;

  if (!months) {
    throw new ApiError(400, "Number of months is required");
  }

  const company = await Company.findById(companyId).populate("plan");
  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const latestBill = await Bill.findOne({ companyId }).sort({ invoiceDate: -1 });
  const plan = company.plan;
  const userCount = company.subscription.userCount || company.maxUsers || 10;

  const startDate = new Date();
  const expiryDate = company.subscription.expiryDate && company.subscription.expiryDate > new Date() 
    ? new Date(company.subscription.expiryDate) 
    : new Date();
  
  expiryDate.setMonth(expiryDate.getMonth() + Number(months));

  const basePrice = plan.price || 0;
  const subscriptionAmount = basePrice * userCount * months;

  const lineItems = [
    {
      description: `${plan.name} Free Trial/Extension (${months} months)`,
      quantity: userCount,
      unitPrice: basePrice,
      amount: subscriptionAmount,
      itemType: "SUBSCRIPTION"
    }
  ];

  const invoiceNumber = await Counter.getNextInvoiceNumber();

  const newBill = await Bill.create({
    companyId,
    invoiceNumber,
    invoiceDate: startDate,
    type: "FREE_TRIAL",
    previousBillId: latestBill ? latestBill._id : null,
    subscriptionPeriod: {
      start: startDate,
      end: expiryDate,
      months: Number(months)
    },
    planSnapshot: {
      planId: plan._id,
      planName: plan.name,
      pricePerUser: basePrice,
      billingCycle: "Monthly"
    },
    userCount,
    lineItems,
    subtotal: subscriptionAmount,
    additionalCharges: 0,
    discount: {
      type: "FIXED",
      value: subscriptionAmount,
      amount: subscriptionAmount
    },
    taxBreakdown: {
      taxType: "GST",
      rate: 0,
      amount: 0
    },
    taxableAmount: 0,
    totalAmount: 0,
    currency: "INR",
    paymentStatus: "WAIVED",
    status: "FINALIZED",
    notes: notes || `Granted ${months} free months`,
    createdBy: req.user.id
  });

  company.subscription.expiryDate = expiryDate;
  company.subscription.status = "TRIAL";
  company.subscription.lastInvoiceId = newBill._id;
  company.status = "ACTIVE";
  await company.save();

  res.status(200).json({
    success: true,
    message: "Free trial granted successfully",
    data: {
      company,
      bill: newBill
    }
  });
});
// @desc    Mark a bill as PAID
// @route   PATCH /api/platform/companies/bills/:billId/pay
export const markBillAsPaid = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.billId);
  if (!bill) throw new ApiError(404, "Bill not found");

  bill.paymentStatus = "PAID";
  bill.paidAt = new Date();
  await bill.save();

  res.status(200).json({
    success: true,
    message: "Bill marked as PAID",
    data: bill
  });
});

// @desc    Download Bill PDF
// @route   GET /api/platform/companies/bills/:billId/download
export const downloadBillPDF = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.billId).populate("companyId").populate("billingEntityId");
  if (!bill) throw new ApiError(404, "Bill not found");

  const pdfBase64 = await generateInvoicePDF(bill, bill.companyId, bill.billingEntityId);

  res.status(200).json({
    success: true,
    data: {
      pdf: pdfBase64,
      fileName: `Invoice_${bill.invoiceNumber}.pdf`
    }
  });
});
// @desc    Get global platform-wide statistics for the dashboard
// @route   GET /api/platform/companies/stats
export const getPlatformStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
  }

  // 1. Total Organizations
  const totalOrgs = await Company.countDocuments();
  const activeOrgs = await Company.countDocuments({ status: "ACTIVE" });
  const suspendedOrgs = await Company.countDocuments({ status: "SUSPENDED" });

  // 2. Financial Metrics (Filtered by date)
  const revenueFilter = startDate && endDate 
    ? { paymentStatus: "PAID", createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
    : { paymentStatus: "PAID" };

  const revenueData = await Bill.aggregate([
    { $match: revenueFilter },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } }
  ]);
  const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

  const pendingFilter = startDate && endDate
    ? { paymentStatus: "PENDING", createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
    : { paymentStatus: "PENDING" };

  const pendingData = await Bill.aggregate([
    { $match: pendingFilter },
    { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } }
  ]);
  const outstandingDues = pendingData.length > 0 ? pendingData[0].total : 0;
  const pendingBillsCount = pendingData.length > 0 ? pendingData[0].count : 0;

  // 3. User Metrics (Filtered by date)
  const userFilter = startDate && endDate
    ? { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
    : {};
  
  const totalUsers = await User.countDocuments();
  const newUsersInRange = await User.countDocuments(userFilter);
  const activeUsersToday = await User.countDocuments({ isActive: true });

  // 4. Critical Metrics
  const now = new Date();
  const expiredLicenses = await Company.countDocuments({ "subscription.expiryDate": { $lt: now } });

  // 5. Time-Series Data (Last 6 Months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const revenueTrend = await Bill.aggregate([
    { 
      $match: { 
        paymentStatus: "PAID", 
        createdAt: { $gte: sixMonthsAgo } 
      } 
    },
    {
      $group: {
        _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
        total: { $sum: "$totalAmount" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  const userOnboardingTrend = await User.aggregate([
    { 
      $match: { 
        createdAt: { $gte: sixMonthsAgo } 
      } 
    },
    {
      $group: {
        _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // 6. Top Orgs (Filtered by Revenue - All Time)
  const topOrgs = await Bill.aggregate([
    { $match: { paymentStatus: "PAID" } },
    { $group: { _id: "$companyId", revenue: { $sum: "$totalAmount" } } },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
    { $lookup: { from: "companies", localField: "_id", foreignField: "_id", as: "company" } },
    { $unwind: "$company" },
    { $lookup: { from: "users", localField: "_id", foreignField: "companyId", as: "users" } },
    {
       $project: {
          name: "$company.name",
          id: "$company.code",
          revenue: 1,
          status: "$company.status",
          userCount: { $size: "$users" },
          plan: "$company.subscription.billingCycle"
       }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      metrics: {
        totalOrgs,
        activeOrgs,
        suspendedOrgs,
        totalRevenue,
        outstandingDues,
        pendingBillsCount,
        totalUsers,
        newUsersInRange,
        activeUsersToday,
        expiredLicenses
      },
      trends: {
        revenueTrend,
        userOnboardingTrend
      },
      topOrgs
    }
  });
});
