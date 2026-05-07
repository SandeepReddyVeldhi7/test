import mongoose from "mongoose";

const tourPlanSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    month: {
      type: Number, // 1-12
      required: true
    },

    year: {
      type: Number,
      required: true
    },

    plans: [
      {
        date: { type: Date, required: true },

        workType: {
          type: String,
          required: true
        },

        territoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Territory"
        },
        area: String,

        jointWorkers: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }],

        clients: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: "Client"
        }],

        remarks: String,

        status: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED", "RESUBMITTED"],
          default: "PENDING"
        },


        managerComment: String
      }
    ],
    approval: {
      status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING"
      },

      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },

      approvedAt: Date,

      rejectionReason: String
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

tourPlanSchema.index(
  { companyId: 1, userId: 1, month: 1, year: 1 },
  { unique: true }
);

export default mongoose.model("TourPlan", tourPlanSchema);
