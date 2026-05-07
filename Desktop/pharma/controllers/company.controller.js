import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { Company, Role, User, Plan, ChatRoom, Bill, Counter, DashboardUser, DashboardRole } from "../models/index.js";
import bcrypt from "bcryptjs";
import { sendEmail } from "../services/email.service.js";

export const createCompany = asyncHandler(async (req, res) => {
  const {
    name,
    planId,
    industry,
    contactEmail,
    phoneNumber,
    orgType,
    address,
    adminName,
    adminEmail,
    adminEmpId,
    adminPassword,
    userCount,
    months,
    gstId,
    additionalCharges = 0,
    discountPercentage = 0,
    taxRate = 18,
    billingCycle = "Monthly"
  } = req.body;

  if (!name || !planId) {
    throw new ApiError(400, "Company name and plan ID are required");
  }

  // Fetch Plan
  const plan = await Plan.findById(planId);
  if (!plan) {
    throw new ApiError(404, "Selected plan not found");
  }

  // Generate company code: 4 letters from name + 4 random digits
  const namePrefix = name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase().padEnd(4, "X");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const code = `${namePrefix}${randomSuffix}`;

  // Check duplicate code
  const existingCompany = await Company.findOne({ code });
  if (existingCompany) {
    throw new ApiError(400, "Company code collision. Please try again.");
  }

  // Generate SaaS Configuration
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const webUrl = `${slug}.finchforce.com`;
  const accessKey = code; // Same as company code

  // ─── Financial Calculations ───────────────────────────────────
  const basePrice = plan.price || 0;
  const billingCycleDiscount = months >= 12 ? 0.8 : 1;
  const unitPrice = Math.floor(basePrice * billingCycleDiscount);
  const subscriptionAmount = unitPrice * (userCount || 0) * (months || 0);

  // Build line items
  const lineItems = [
    {
      description: `${plan.name} Subscription (${userCount} users × ${months} months)`,
      quantity: userCount,
      unitPrice,
      amount: subscriptionAmount,
      itemType: "SUBSCRIPTION"
    }
  ];

  if (Number(additionalCharges) > 0) {
    lineItems.push({
      description: "Setup & Migration Charges",
      quantity: 1,
      unitPrice: Number(additionalCharges),
      amount: Number(additionalCharges),
      itemType: "SETUP"
    });
  }

  const subtotal = subscriptionAmount + Number(additionalCharges);
  const discountAmount = (subtotal * Number(discountPercentage)) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = Math.floor(taxableAmount * (Number(taxRate) / 100));
  const totalFinal = taxableAmount + taxAmount;

  // Sequential invoice number
  const invoiceNumber = await Counter.getNextInvoiceNumber();

  // Employee ID for Super Admin
  const employeeId = adminEmpId || `${code}-SA-001`;

  // ─── Subscription period ──────────────────────────────────────
  const startDate = new Date();
  const expiryDate = new Date();
  if (months) {
    expiryDate.setMonth(startDate.getMonth() + Number(months));
  } else {
    expiryDate.setDate(startDate.getDate() + (plan.durationInDays || 30));
  }

  // ─── Step 1: Send Email First ─────────────────────────────────
  const emailHtml = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 20px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.05em;">FINCH FORCE</h1>
        <p style="margin: 10px 0 0; opacity: 0.8; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.2em;">Workspace Provisioned Successfully</p>
      </div>
      
      <div style="padding: 30px; background: white;">
        <h2 style="color: #1e293b; margin-top: 0;">Welcome, ${adminName || name}!</h2>
        <p style="color: #64748b; line-height: 1.6;">Your organization <strong>${name}</strong> has been successfully onboarded. Below are your workspace credentials and invoice.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 25px 0;">
          <h3 style="margin-top: 0; font-size: 12px; text-transform: uppercase; color: #4f46e5; letter-spacing: 0.1em;">Workspace Access</h3>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Web URL:</strong> <a href="https://${webUrl}" style="color: #4f46e5;">${webUrl}</a></p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Access Key:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${accessKey}</code></p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
          <h3 style="margin-top: 0; font-size: 12px; text-transform: uppercase; color: #4f46e5; letter-spacing: 0.1em;">Super Admin Login</h3>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Employee ID:</strong> ${employeeId}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Initial Password:</strong> ${adminPassword}</p>
        </div>

        <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #f1f5f9; padding: 15px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin: 0; font-size: 12px; text-transform: uppercase; color: #475569; letter-spacing: 0.1em;">Invoice #${invoiceNumber}</h3>
          </div>
          <div style="padding: 15px;">
            <table style="width: 100%; font-size: 13px; color: #1e293b; border-collapse: collapse;">
              ${lineItems.map(item => `
              <tr>
                <td style="padding: 8px 0; color: #64748b;">${item.description}</td>
                <td style="padding: 8px 0; text-align: right;">₹${item.amount.toLocaleString()}</td>
              </tr>`).join("")}
              ${discountPercentage > 0 ? `
              <tr>
                <td style="padding: 8px 0; color: #10b981;">Discount (${discountPercentage}%)</td>
                <td style="padding: 8px 0; text-align: right; color: #10b981;">-₹${discountAmount.toLocaleString()}</td>
              </tr>` : ""}
              <tr style="border-top: 1px solid #e2e8f0;">
                <td style="padding: 12px 0; color: #64748b;">${taxRate}% Tax</td>
                <td style="padding: 12px 0; text-align: right;">₹${taxAmount.toLocaleString()}</td>
              </tr>
              <tr style="font-weight: 900; font-size: 16px;">
                <td style="padding: 12px 0; color: #1e293b;">Total Amount</td>
                <td style="padding: 12px 0; text-align: right; color: #4f46e5;">₹${totalFinal.toLocaleString()}</td>
              </tr>
            </table>
          </div>
        </div>

        <p style="margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
          If you have any questions, contact billing@finchforce.com<br/>
          &copy; ${new Date().getFullYear()} Finch Force Enterprise Solutions
        </p>
      </div>
    </div>
  `;

  try {
    const emailRecipients = [adminEmail];
    if (contactEmail && contactEmail !== adminEmail) {
      emailRecipients.push(contactEmail);
    }
    
    await Promise.all(emailRecipients.map(email => 
      sendEmail(email, `Welcome to Finch Force - Invoice #${invoiceNumber}`, emailHtml, name)
    ));
  } catch (err) {
    console.error("Failed to send welcome email:", err);
    throw new ApiError(500, "Failed to send invitation email. Organisation creation aborted.");
  }

  // ─── Step 2: Create Database Records ──────────────────────────
  const logoPath = req.file ? `/uploads/createcompany/${req.file.filename}` : null;

  const company = await Company.create({
    name,
    code,
    plan: plan._id,
    industry,
    contactEmail,
    phoneNumber,
    orgType,
    address,
    logoUrl: logoPath,
    webUrl,
    accessKey,
    subscription: {
      billingCycle,
      startDate,
      expiryDate,
      months: Number(months) || 1,
      userCount: Number(userCount) || 10,
      status: "ACTIVE",
      autoRenew: false
    },
    maxUsers: Number(userCount) || plan.maxUsers || 50,
    currentUsers: 1,
    createdBy: req.user.id
  });

  const role = await Role.create({
    name: "SUPER_ADMIN",
    level: 1,
    companyId: company._id,
    createdBy: req.user.id,
  });

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const superAdmin = await User.create({
    companyId: company._id,
    name: adminName || `${name} Admin`,
    employeeId,
    roleId: role._id,
    managerId: null,
    password: hashedPassword,
    email: adminEmail,
  });

  // Provision Dashboard Role and User for Admin
  const dashboardRole = await DashboardRole.create({
    companyId: company._id,
    name: "SUPER_ADMIN",
    permissions: ["Dashboard", "Analytics", "Administration", "Finance", "Dashboard Users"]
  });

  await DashboardUser.create({
    companyId: company._id,
    name: adminName || `${name} Admin`,
    email: adminEmail,
    password: hashedPassword,
    roleId: dashboardRole._id
  });

  // ─── Step 3: Create Bill Record ───────────────────────────────
  const bill = await Bill.create({
    companyId: company._id,
    invoiceNumber,
    invoiceDate: startDate,
    type: "INITIAL",
    previousBillId: null,
    subscriptionPeriod: {
      start: startDate,
      end: expiryDate,
      months: Number(months) || 1
    },
    planSnapshot: {
      planId: plan._id,
      planName: plan.name,
      pricePerUser: unitPrice,
      billingCycle
    },
    userCount: Number(userCount) || 10,
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
    gstId,
    notes: `Initial subscription for ${name}`,
    createdBy: req.user.id
  });

  // Update company with last invoice reference
  await Company.findByIdAndUpdate(company._id, {
    "subscription.lastInvoiceId": bill._id
  });

  // Automatic Company Group
  const autoChatEnabled = plan.permissions?.includes("internalChat") || plan.features?.includes("internalChat");
  if (autoChatEnabled) {
    try {
      await ChatRoom.create({
        companyId: company._id,
        type: "GROUP",
        name: `${name} Official`,
        isCompanyGroup: true,
        members: [superAdmin._id],
        admins: [superAdmin._id],
        createdBy: superAdmin._id
      });
    } catch (err) {
      console.error("[AutoGroup] Error creating company group:", err.message);
    }
  }

  res.status(201).json({
    message: "Company created successfully",
    company,
    bill: {
      invoiceNumber: bill.invoiceNumber,
      totalAmount: bill.totalAmount,
      status: bill.status
    },
    superAdminCredentials: {
      companyCode: code,
      employeeId,
      email: adminEmail,
      webUrl,
      accessKey
    },
  });
});
export const getSalaryStructure = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user.companyId);
  res.json({ success: true, salaryStructure: company.salaryStructure || [] });
});

export const updateSalaryStructure = asyncHandler(async (req, res) => {
  let { salaryStructure } = req.body;

  // Convert array of strings to array of objects if needed
  if (Array.isArray(salaryStructure) && salaryStructure.length > 0 && typeof salaryStructure[0] === 'string') {
    salaryStructure = salaryStructure.map(label => ({ label }));
  }

  const company = await Company.findByIdAndUpdate(
    req.user.companyId,
    { salaryStructure },
    { new: true }
  );
  res.json({ success: true, salaryStructure: company.salaryStructure });
});

export const getCompanyDetails = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user.companyId).populate("plan");
  if (!company) throw new ApiError(404, "Company not found");
  res.json({ success: true, company });
});

export const updateCompany = asyncHandler(async (req, res) => {
  const { name, industry, phoneNumber, address, webUrl, industryType, orgType, contactEmail } = req.body;
  const logoUrl = req.file ? `/uploads/createcompany/${req.file.filename}` : undefined;

  const updates = { name, industry, phoneNumber, address, webUrl, industryType, orgType, contactEmail };
  
  // Remove undefined fields
  Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);
  
  if (logoUrl) updates.logoUrl = logoUrl;

  const company = await Company.findByIdAndUpdate(
    req.user.companyId,
    { $set: updates },
    { new: true }
  ).populate("plan");

  res.json({ success: true, message: "Company details updated successfully", company });
});
