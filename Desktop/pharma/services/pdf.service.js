import PDFDocument from "pdfkit";
import { Buffer } from "buffer";

/**
 * Generates a professional invoice PDF matching the provided reference image layout
 */
export const generateInvoicePDF = async (bill, company, billingEntity) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 40,
        size: "A4" 
      });
      let buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => {
        const result = Buffer.concat(buffers);
        resolve(result.toString("base64"));
      });

      // ─── Header ──────────────────────────────────────────────────
      if (billingEntity.logo && billingEntity.logo.startsWith("data:image")) {
        try {
          const base64Data = billingEntity.logo.replace(/^data:image\/\w+;base64,/, "");
          const logoBuffer = Buffer.from(base64Data, "base64");
          doc.image(logoBuffer, 460, 40, { width: 80 });
        } catch (err) {
          console.error("Failed to render logo in PDF:", err.message);
        }
      }

      doc.font("Helvetica-Bold").fontSize(24).text("INVOICE", 0, 40, { align: "center" });
      
      doc.fontSize(14).text(billingEntity.name || "Finch Axis Private Limited", 0, 70, { align: "center" });
      doc.font("Helvetica").fontSize(9).text(billingEntity.address || "Enterprise Billing System", 0, 88, { align: "center" });
      
      const website = "www.finchforce.com";
      doc.text(website, 0, 100, { align: "center" });

      // ─── Main Info Box (Rounded) ──────────────────────────────────
      const boxTop = 120;
      const boxHeight = 140;
      doc.roundedRect(40, boxTop, 515, boxHeight, 10).stroke("#cccccc");

      // Bill To (Left)
      doc.font("Helvetica-Bold").fontSize(10).text("Bill to:", 60, boxTop + 15);
      doc.fontSize(11).text(company.name, 60, boxTop + 35);
      doc.font("Helvetica").fontSize(9).text(company.address || "No address provided", 60, boxTop + 50, { width: 250 });
      doc.font("Helvetica-Bold").text(`GSTIN : ${company.gstId || "N/A"}`, 60, boxTop + 115);

      // Invoice Details (Right)
      const rightColX = 330;
      const labelWidth = 80;
      
      const drawInfoLine = (label, value, y) => {
        doc.font("Helvetica").fontSize(10).text(label, rightColX, y);
        doc.text(":", rightColX + labelWidth, y);
        doc.font("Helvetica").text(value, rightColX + labelWidth + 10, y);
      };

      drawInfoLine("Invoice No", bill.invoiceNumber, boxTop + 15);
      drawInfoLine("Date", new Date(bill.invoiceDate).toLocaleDateString(), boxTop + 30);
      drawInfoLine("Bill Period", `${new Date(bill.subscriptionPeriod.start).toLocaleDateString()} - ${new Date(bill.subscriptionPeriod.end).toLocaleDateString()}`, boxTop + 45);
      drawInfoLine("Due Date", new Date(bill.invoiceDate).toLocaleDateString(), boxTop + 60);

      // ─── Particulars Table ───────────────────────────────────────
      doc.font("Helvetica-Bold").fontSize(12).text("Particulars", 0, boxTop + boxHeight + 30, { align: "center" });
      
      const tableTop = boxTop + boxHeight + 55;
      const col1 = 40;  // S.No
      const col2 = 80;  // Description
      const col3 = 450; // Amount
      const tableWidth = 515;

      // Draw Headers
      doc.rect(col1, tableTop, tableWidth, 20).stroke("#000000");
      doc.fontSize(10).text("S.No", col1 + 5, tableTop + 6);
      doc.text("Description", col2 + 5, tableTop + 6);
      doc.text("Amount in Rs.", col3 + 5, tableTop + 6, { width: 95, align: "right" });

      let currentY = tableTop + 20;

      // Line Items
      const drawRow = (sno, desc, amount, isBold = false) => {
        doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
        const descHeight = doc.heightOfString(desc, { width: col3 - col2 - 10 });
        const rowHeight = Math.max(descHeight + 10, 25);

        doc.rect(col1, currentY, tableWidth, rowHeight).stroke();
        doc.text(sno, col1 + 5, currentY + 7);
        doc.text(desc, col2 + 5, currentY + 7, { width: col3 - col2 - 10 });
        doc.text(amount, col3 + 5, currentY + 7, { width: 95, align: "right" });
        
        currentY += rowHeight;
      };

      // 1. Subscription
      drawRow("1", `Being the Payment for ${bill.planSnapshot.userCount} User Subscription Charges for using the application for the Period ${new Date(bill.subscriptionPeriod.start).toLocaleDateString()} to ${new Date(bill.subscriptionPeriod.end).toLocaleDateString()}.`, bill.subtotal.toLocaleString());
      
      // 2. Additional Charges
      if (bill.additionalCharges > 0) {
        drawRow("2", "Additional Setup & Migration Charges", bill.additionalCharges.toLocaleString());
      } else {
        drawRow("2", "Other Charges ( 0 )", "0");
      }

      // 3. Discount (if any)
      if (bill.discount.amount > 0) {
        drawRow("3", `Discount Applied (${bill.discount.value}%)`, `-${bill.discount.amount.toLocaleString()}`);
      }

      // 4. Tax
      drawRow("4", `${bill.taxBreakdown.taxType} ( ${bill.taxBreakdown.rate} % )`, bill.taxBreakdown.amount.toLocaleString());

      // 5. Total
      drawRow("", "Total Amount in Rs.", bill.totalAmount.toLocaleString(), true);

      // ─── Footer Details ──────────────────────────────────────────
      currentY += 30;
      doc.font("Helvetica-Bold").fontSize(9);
      doc.text(`IGSTIN ${billingEntity.gstin || "N/A"}   PAN No:-${billingEntity.pan || "N/A"}`, col1, currentY);
      
      currentY += 25;
      doc.font("Helvetica").fontSize(9).text("SAC Codes : 997331 : Licensing services for the right to use computer software and databases", col1, currentY);

      currentY += 35;
      doc.text(`Payment to be made in Favour of "${billingEntity.name || "Finch Axis Pvt Ltd"}"`, col1, currentY);
      
      currentY += 20;
      doc.text(`Our Banker Name : ${billingEntity.bankName || "Indian Bank"}`, col1, currentY);
      currentY += 15;
      doc.text(`Address : ${billingEntity.bankAddress || "Main Branch"}`, col1, currentY);
      currentY += 15;
      doc.text(`Current Account No : ${billingEntity.accountNumber || "779371898"}`, col1, currentY);
      currentY += 15;
      doc.text(`IFSC CODE : ${billingEntity.ifsc || "IDIB000 W005"}`, col1, currentY);

      // Signature
      currentY += 60;
      doc.text(`For ${billingEntity.name || "Finch Axis Pvt Ltd"}`, col1, currentY);
      currentY += 40;
      doc.text("Manager Accounts", col1, currentY);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
