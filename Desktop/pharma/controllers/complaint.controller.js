import { Complaint } from "../models/index.js";

/**
 * @desc    Create a new complaint
 * @route   POST /api/complaints
 * @access  Private
 */
export const createComplaint = async (req, res) => {
    try {
        const { subject, module, mobile, email, details } = req.body;

        if (!subject || !module || !mobile || !email || !details) {
            return res.status(400).json({ message: "Please fill all fields" });
        }

        const complaint = await Complaint.create({
            companyId: req.user.companyId,
            userId: req.user._id,
            subject,
            module,
            mobile,
            email,
            details,
        });

        res.status(201).json({
            success: true,
            message: "Complaint submitted successfully",
            complaint,
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

/**
 * @desc    Get user's complaints
 * @route   GET /api/complaints/me
 * @access  Private
 */
export const getEmployeeComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find({ userId: req.user._id })
            .sort("-createdAt");

        res.status(200).json(complaints);
    } catch (error) {
        res.status(500).json({ message: error.message || "Server Error" });
    }
};
