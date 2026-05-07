import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    name: { type: String, required: true },

    territoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Territory"
    },
    priority: {
      type: String,
      enum: ["L", "UL"],
      default: "UL"

    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },

    clientType: {
      type: String,
    },

    clientInterest: {
      type: String,
    },

    dob: Date,
    anniversary: Date,

    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String }
    },
    specialDateType: {
      type: String,
    },
    photo: {
      type: String
    },
    designation: { type: String },
    area: { type: String },
    station: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Client", clientSchema);
