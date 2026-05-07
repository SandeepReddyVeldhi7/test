import mongoose from "mongoose";

const dcrSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },

    // jointWorkWith: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    callStatus: String,
    feedback: String,
    remarks: String,

    location: {
      lat: Number,
      lng: Number
    },

    date: { type: Date, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("DCR", dcrSchema);
