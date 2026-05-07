import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    type: {
      type: String,
      enum: ["ONE_TO_ONE", "GROUP"],
      required: true,
    },

    isCompanyGroup: {
      type: Boolean,
      default: false
    },

    managerId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: "User"
    },

    name: String, // group name
    photo: String, // group profile picture path

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    exitedMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    lastMessage: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
      text: String,
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      sentAt: { type: Date, default: Date.now },
      deliveryStatus: {
        type: String,
        enum: ["SENT", "DELIVERED", "SEEN"],
        default: "SENT"
      }
    },
  },
  { timestamps: true }
);

export default mongoose.model("ChatRoom", chatRoomSchema);
