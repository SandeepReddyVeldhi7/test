import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },

    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    type: {
      type: String,
      enum: ["TEXT", "IMAGE", "FILE", "VOICE", "LOCATION", "SYSTEM", "MEETING"],
      default: "TEXT"
    },

    meetingMetadata: {
        title: String,
        details: String,
        zoomLink: String,
        date: Date,
        isCanceled: { type: Boolean, default: false }
    },

    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message"
    },

    isForwarded: {
      type: Boolean,
      default: false
    },

    text: String,

    fileUrl: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,

    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },

    duration: Number, // for voice in seconds

    deliveryStatus: {
        type: String,
        enum: ["SENT", "DELIVERED", "SEEN"],
        default: "SENT"
    },

    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    isDeleted: {
      type: Boolean,
      default: false
    },

    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        emoji: String
      }
    ],

    editedAt: Date

  },
  { timestamps: true }
);

export default mongoose.model("Message",messageSchema)