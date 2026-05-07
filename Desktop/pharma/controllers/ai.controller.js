import { GoogleGenerativeAI } from "@google/generative-ai";
import { ActivityLog, Expense, Leave, User, TourPlan, DayPlan, MonthlyAchievement } from "../models/index.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

// Initialize Gemini
// Note: User must provide GEMINI_API_KEY in .env
const getModel = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
};

/**
 * @desc Get AI-powered insights for company data
 * @route POST /api/ai/query
 * @access Private (Admin Only)
 */
export const getAIInsights = asyncHandler(async (req, res) => {
  const { query } = req.body;
  const companyId = req.user.companyId;

  if (!query) {
    throw new ApiError(400, "Query is required");
  }

  const model = getModel();
  if (!model) {
    return res.status(200).json({
      success: true,
      data: {
        answer: "AI features are currently offline. Please configure your GEMINI_API_KEY to enable this functionality.",
        insights: ["System is in maintenance mode"],
        chartData: [],
        recommendations: ["Configure API Key in environment settings"]
      }
    });
  }

  // ── 1. GATHER SECURE MULTI-TENANT DATA ────────────────────────────────────
  // We fetch a summary of the company's performance to provide context to the LLM
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Basic stats
  const totalUsers = await User.countDocuments({ companyId });
  const activeUsers = await User.countDocuments({ companyId, isActive: true });

  // Activity distribution
  const activities = await ActivityLog.aggregate([
    { $match: { companyId, timestamp: { $gte: thirtyDaysAgo } } },
    { $group: { _id: "$action", count: { $sum: 1 } } }
  ]);

  // Financial summary
  const expenses = await Expense.aggregate([
    { 
      $match: { 
        companyId, 
        date: { $gte: thirtyDaysAgo }, 
        "approval.status": "APPROVED" 
      } 
    },
    { 
      $group: { 
        _id: null, 
        total: { $sum: "$amount" }, 
        count: { $sum: 1 } 
      } 
    }
  ]);

  // Operational metrics
  const pendingLeaves = await Leave.countDocuments({ companyId, status: "PENDING" });
  const completedDCRs = await ActivityLog.countDocuments({ 
    companyId, 
    action: "DCR", 
    timestamp: { $gte: thirtyDaysAgo } 
  });

  // ── 2. PREPARE CONTEXT ───────────────────────────────────────────────────
  const context = `
    Business Context for Company ID: ${companyId}
    ---
    Personnel:
    - Total Employees: ${totalUsers}
    - Active Employees: ${activeUsers}
    
    Performance (Last 30 Days):
    - Total Sales/DCR Activities: ${completedDCRs}
    - Activity Distribution: ${JSON.stringify(activities.map(a => `${a._id}: ${a.count}`).join(", "))}
    
    Finances:
    - Total Approved Expenses: ₹${expenses[0]?.total || 0}
    - Number of Expense Claims: ${expenses[0]?.count || 0}
    
    Operations:
    - Pending Leave Requests: ${pendingLeaves}
  `;

  // ── 3. GENERATE RESPONSE (STREAMING) ────────────────────────────────────
  const prompt = `
    You are an expert Pharma Sales Force Effectiveness (SFE) Business Analyst.
    Your task is to analyze the provided company data and answer the user's question.
    
    Rules:
    1. Only use the data provided in the context.
    2. Be professional and data-driven.
    3. If the user asks for a chart, include data in the JSON block at the end.
    
    Response Format:
    Write your detailed conversational answer first. 
    Once the answer is complete, add the delimiter "---DATA---" followed by a JSON object containing insights, chartData, and recommendations.
    
    Example Output:
    Your sales are up by 10% this month... [more text]
    
    ---DATA---
    {
      "insights": ["Growth in HQ area", "Expense ratio is stable"],
      "chartData": [{"name": "Jan", "value": 400}],
      "recommendations": ["Focus on secondary sales"]
    }
    
    Company Context:
    ${context}
    
    User Question: "${query}"
  `;

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const result = await model.generateContentStream(prompt);
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
    }
    
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("AI Insight Streaming Error:", error);
    res.write(`data: ${JSON.stringify({ error: "AI Analysis failed. Please try again later." })}\n\n`);
    res.end();
  }
});

/**
 * @desc Export AI Analysis data as PDF or Excel
 * @route POST /api/ai/export
 * @access Private
 */
export const exportAIReport = asyncHandler(async (req, res) => {
  const { result, type } = req.body;
  
  if (!result || !type) {
    throw new ApiError(400, "Data and type are required");
  }

  if (type === 'pdf') {
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=AI_Analysis_${Date.now()}.pdf`);
    doc.pipe(res);

    // Title
    doc.fontSize(24).font('Helvetica-Bold').text("AI Business Analysis Report", { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    doc.fontSize(16).font('Helvetica-Bold').text("Executive Summary");
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').text(result.answer, { align: 'justify', lineGap: 5 });
    doc.moveDown(2);

    // Insights
    doc.fontSize(16).font('Helvetica-Bold').text("Key Insights");
    doc.moveDown(0.5);
    result.insights.forEach((insight, i) => {
      doc.fontSize(11).font('Helvetica').text(`${i + 1}. ${insight}`, { indent: 20 });
      doc.moveDown(0.5);
    });
    doc.moveDown(1.5);

    // Recommendations
    doc.fontSize(16).font('Helvetica-Bold').text("Strategic Recommendations");
    doc.moveDown(0.5);
    result.recommendations.forEach((rec, i) => {
      doc.fontSize(11).font('Helvetica').text(`• ${rec}`, { indent: 20 });
      doc.moveDown(0.5);
    });

    doc.end();
  } else if (type === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("AI Analysis");

    sheet.columns = [
      { header: "Category", key: "category", width: 20 },
      { header: "Detail", key: "detail", width: 80 }
    ];

    sheet.addRow({ category: "Summary", detail: result.answer });
    sheet.addRow({});
    
    sheet.addRow({ category: "KEY INSIGHTS" });
    result.insights.forEach(ins => sheet.addRow({ category: "-", detail: ins }));
    
    sheet.addRow({});
    sheet.addRow({ category: "RECOMMENDATIONS" });
    result.recommendations.forEach(rec => sheet.addRow({ category: "•", detail: rec }));

    // Styling
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(3).font = { bold: true };
    sheet.getRow(result.insights.length + 5).font = { bold: true };

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=AI_Analysis_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
  } else {
    throw new ApiError(400, "Invalid export type");
  }
});
