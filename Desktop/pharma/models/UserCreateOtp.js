import mongoose from "mongoose";

const userCreateOtpSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },

  name: String,
  email: String,
  mobile: String,
  password: String,
  employeeId: String,
  designation: String,
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }, managerType: {
    type: String,
    enum: ["own", "others"],
    default: "own",
  },
  otpHash: String,
  otpExpiresAt: Date,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  stations: [String],
  subAreas: [String],
  targets: [
    {
      year: Number,
      targets: [
        {
          month: String,
          target: Number,
        }
      ]
    }
  ],
  salaryRevisions: Array,
  dailyAllowance: Number,
}, { timestamps: true });

export default mongoose.model("UserCreateOtp", userCreateOtpSchema);