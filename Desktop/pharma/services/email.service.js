import dotenv from "dotenv";

dotenv.config();

const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();
const SENDER_EMAIL = "veldhisandeepreddy@gmail.com";
const SENDER_NAME = "Finch Force";

if (!BREVO_API_KEY) {
  console.error("❌ CRITICAL: BREVO_API_KEY is not defined in environment variables!");
} else {
  console.log("✅ Brevo API Key detected (starts with):", BREVO_API_KEY.substring(0, 10) + "...");
}

/**
 * Core function to send email via Brevo REST API (HTTPS)
 */
const sendBrevoEmail = async ({ to, subject, htmlContent, attachments = [] }) => {
  try {
    const payload = {
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: Array.isArray(to) ? to.map(e => ({ email: e })) : [{ email: to }],
      subject: subject,
      htmlContent: htmlContent,
    };

    if (Array.isArray(attachments) && attachments.length > 0) {
      payload.attachment = attachments;
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to send email via Brevo API");
    }
    return data;
  } catch (err) {
    console.error("BREVO API ERROR:", err.message);
    throw err;
  }
};

const getDarkThemeWrapper = (content, logoUrl = null, companyName = "Finch Force") => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" 
            style="max-width:600px;background-color:#111827;border-radius:16px;padding:40px;color:#ffffff;box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <tr>
              <td align="center" style="padding-bottom:30px;">
                ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height:60px;width:auto;" />` : `<span style="font-size:24px;font-weight:bold;color:#3b82f6;">🚀 ${companyName}</span>`}
              </td>
            </tr>
            ${content}
            <tr>
              <td style="padding-top:40px;border-top:1px solid rgba(255,255,255,0.05);">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:12px;color:#6b7280;line-height:1.5;">
                      Warm regards,<br/>
                      <strong>Team FinchForce</strong><br/>
                      Support | Onboarding Team
                    </td>
                    <td align="right" style="font-size:11px;color:#4b5563;">
                      © ${new Date().getFullYear()} ${companyName}.<br/>All rights reserved.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
`;

export const sendOtpEmail = async ({ to, name, otp, companyName = "Finch Force" }) => {
  const content = `
    <tr>
      <td style="font-size:16px;line-height:1.6;color:#e2e8f0;padding-bottom:25px;">
        Dear Mr. ${name || "User"},<br/><br/>
        Greetings from FinchForce.<br/><br/>
        To complete your secure sign-in to the <strong>FinchForce Admin Console</strong>, please use the One-Time Password (OTP) provided below:
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-bottom:30px;">
        <p style="margin:0 0 10px 0;font-size:12px;font-weight:black;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;">Verification Code</p>
        <div style="background-color:#1f2937;padding:25px 0;border-radius:16px;font-size:42px;letter-spacing:12px;font-weight:bold;color:#3b82f6;border: 1px solid rgba(59, 130, 246, 0.3);box-shadow: 0 10px 20px rgba(0,0,0,0.2);">
          ${otp}
        </div>
      </td>
    </tr>
    <tr>
      <td style="font-size:15px;line-height:1.6;color:#cbd5e1;padding-bottom:20px;">
        This code is valid for the next <strong>10 minutes</strong>. For your security, please do not share this code with anyone.<br/><br/>
        If you did not initiate this request, you may safely ignore this email. Your account remains secure.<br/><br/>
        We are committed to ensuring a safe and seamless experience on FinchForce.
      </td>
    </tr>
  `;
  return sendBrevoEmail({
    to,
    subject: `🔐 OTP Verification | FinchForce Admin Console`,
    htmlContent: getDarkThemeWrapper(content, null, companyName),
  });
};

export const sendEmail = async (to, subject, innerHtml, companyName = "Finch Force") => {
  const content = `
    <tr>
      <td style="font-size:16px;line-height:1.6;color:#d1d5db;">
        ${innerHtml}
      </td>
    </tr>
  `;
  return sendBrevoEmail({
    to,
    subject,
    htmlContent: getDarkThemeWrapper(content, null, companyName),
  });
};

export const sendWelcomeEmail = async ({ to, name, orgName, password, webUrl, accessKey, empCode, logo, attachments = [] }) => {
  const content = `
    <tr>
      <td style="font-size:16px;line-height:1.6;color:#e2e8f0;padding-bottom:25px;">
        Dear Mr. ${name},<br/><br/>
        Greetings from FinchForce.<br/><br/>
        We are pleased to inform you that your workspace for <strong>${orgName}</strong> has been successfully provisioned and is ready for use.<br/><br/>
        To get started, please use the following details to connect your mobile application:
      </td>
    </tr>
    <tr>
      <td style="background-color:rgba(59, 130, 246, 0.05);padding:30px;border-radius:16px;border:1px solid rgba(59, 130, 246, 0.1);margin-bottom:25px;">
        <p style="margin:0 0 10px 0;font-size:15px;color:#cbd5e1;"><strong>Workspace URL:</strong> <span style="color:#60a5fa;font-family:monospace;">${webUrl?.replace('https://', '')}</span></p>
        <p style="margin:0;font-size:15px;color:#cbd5e1;"><strong>Access Key:</strong> <span style="color:#60a5fa;font-family:monospace;letter-spacing:1px;">${accessKey || 'Not Available'}</span></p>
      </td>
    </tr>
    <tr>
      <td style="font-size:16px;line-height:1.6;color:#e2e8f0;padding:25px 0;">
        Once connected, you may log in using your Super Admin credentials:
      </td>
    </tr>
    <tr>
      <td style="background-color:rgba(255, 255, 255, 0.03);padding:30px;border-radius:16px;border:1px solid rgba(255, 255, 255, 0.05);">
        <p style="margin:0 0 10px 0;font-size:15px;color:#cbd5e1;"><strong>Employee Code:</strong> <span style="color:#ffffff;">${empCode}</span></p>
        <p style="margin:0;font-size:15px;color:#cbd5e1;"><strong>Temporary Password:</strong> <span style="color:#34d399;">${password}</span></p>
      </td>
    </tr>
    <tr>
      <td style="padding-top:35px;text-align:center;">
        <a href="https://pharma-admin-five.vercel.app/login" style="display:inline-block;background-color:#3b82f6;color:#ffffff;padding:18px 45px;border-radius:14px;text-decoration:none;font-weight:bold;font-size:16px;box-shadow:0 10px 15px -3px rgba(59, 130, 246, 0.4);">Launch Dashboard</a>
      </td>
    </tr>
    <tr>
      <td style="font-size:14px;line-height:1.6;color:#94a3b8;padding-top:35px;">
        For security purposes, we strongly recommend updating your password upon first login.<br/><br/>
        If you require any assistance during setup or onboarding, please feel free to reach out to our support team.<br/><br/>
        We look forward to supporting your team’s success with FinchForce.
      </td>
    </tr>
  `;
  return sendBrevoEmail({
    to,
    subject: `🚀 Workspace Ready | ${orgName} Onboarding`,
    htmlContent: getDarkThemeWrapper(content, logo, "Finch Force"),
    attachments
  });
};

export const sendSubscriptionReminder = async ({ to, name, orgName, expiryDate, daysLeft, renewUrl }) => {
  let subject = "";
  let innerNarrative = "";
  
  if (daysLeft === 30) {
    subject = `Subscription Renewal in 30 Days`;
    innerNarrative = `
      We hope you are having a smooth experience with our platform.<br/><br/>
      This is a gentle reminder that your FinchForce subscription for <strong>${orgName}</strong> is scheduled for renewal in <strong>30 days</strong>. To ensure uninterrupted access to your services, we recommend planning your renewal in advance.<br/><br/>
      Our team is available to assist you with any billing queries or renewal support you may need.<br/><br/>
      Thank you for choosing FinchForce. We truly value your continued partnership.
    `;
  } else if (daysLeft === 15) {
    subject = `Your Subscription Renewal is Approaching (15 Days Left)`;
    innerNarrative = `
      This is a friendly reminder that your subscription for <strong>${orgName}</strong> will be due for renewal in <strong>15 days</strong>.<br/><br/>
      To avoid any interruption in your services, we kindly request you to complete the renewal process at your convenience. If you require an invoice, quotation, or assistance, our team will be happy to support you.<br/><br/>
      We appreciate your continued trust in FinchForce.
    `;
  } else {
    subject = `Subscription Renewal Due in 3 Days`;
    innerNarrative = `
      This is a final reminder that your FinchForce subscription for <strong>${orgName}</strong> is due for renewal in <strong>3 days</strong>.<br/><br/>
      To ensure uninterrupted access and avoid any service disruption, we kindly request you to complete the renewal at the earliest.<br/><br/>
      If you have already initiated the payment, please disregard this message. For any assistance, our team is always here to help.<br/><br/>
      We sincerely value your partnership and look forward to continuing to support your business.
    `;
  }

  const content = `
    <tr>
      <td style="font-size:16px;line-height:1.6;color:#e2e8f0;padding-bottom:25px;">
        Dear Mr. ${name || "User"},<br/><br/>
        Greetings from FinchForce.<br/><br/>
        ${innerNarrative}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:10px 0 10px 0;">
        <div style="background-color:rgba(59, 130, 246, 0.05);padding:20px;border-radius:12px;border:1px solid rgba(59, 130, 246, 0.1);display:inline-block;min-width:200px;">
           <p style="margin:0;font-size:12px;color:#3b82f6;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">Status Window</p>
           <p style="margin:5px 0 0 0;font-size:24px;font-weight:bold;color:#ffffff;">${daysLeft} Days Remaining</p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding-top:40px;border-top:1px solid rgba(255,255,255,0.05);">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:#6b7280;line-height:1.5;">
              Warm regards,<br/>
              <strong>FinchForce Team</strong><br/>
              Customer Success & Billing
            </td>
            <td align="right" style="font-size:11px;color:#4b5563;">
              © ${new Date().getFullYear()} FinchForce.<br/>All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
    <body style="margin:0;padding:0;background-color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:40px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#111827;border-radius:16px;padding:40px;color:#ffffff;box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
              <tr><td align="center" style="padding-bottom:30px;"><span style="font-size:24px;font-weight:bold;color:#3b82f6;">🚀 Finch Force</span></td></tr>
              ${content}
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendBrevoEmail({
    to,
    subject,
    htmlContent: fullHtml
  });
};