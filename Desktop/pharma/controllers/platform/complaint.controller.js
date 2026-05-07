import Complaint from "../../models/Complaint.model.js";
import { sendEmail } from "../../services/email.service.js";

export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("companyId", "name")
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const complaint = await Complaint.findById(id).populate("userId", "name email");
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    complaint.status = status;
    await complaint.save();

    // Send email to the user
    try {
      const recipientName = complaint.userId?.name || "User";
      const recipientEmail = complaint.email || complaint.userId?.email;

      if (recipientEmail) {
        const emailContent = `
          <h2 style="color: #3b82f6;">Complaint Status Updated</h2>
          <p>Hi ${recipientName},</p>
          <p>The status of your complaint <strong>"${complaint.subject}"</strong> has been updated to <strong style="text-transform: uppercase;">${status}</strong>.</p>
          ${remarks ? `<p><strong>Admin Remarks:</strong> ${remarks}</p>` : ""}
          <p>If you have any further questions, please feel free to reach out to us.</p>
        `;
        await sendEmail(recipientEmail, `Complaint Update: ${complaint.subject}`, emailContent);
      }
    } catch (emailErr) {
      console.error("Failed to send status update email:", emailErr.message);
    }

    res.status(200).json({ success: true, message: "Complaint status updated and email sent" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
