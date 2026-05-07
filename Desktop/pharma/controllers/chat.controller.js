import { ChatRoom } from "../models/index.js";
import { Message } from "../models/index.js";
import { User } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";


export const getOrCreateOneToOneChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    throw new ApiError(400, "User ID required");
  }

  let room = await ChatRoom.findOne({
    companyId: req.user.companyId,
    type: "ONE_TO_ONE",
    members: { $all: [req.user._id, userId] }
  });

  if (!room) {
    room = await ChatRoom.create({
      companyId: req.user.companyId,
      type: "ONE_TO_ONE",
      members: [req.user._id, userId],
      createdBy: req.user._id
    });
  }

  res.status(200).json({
    data: room
  });
});


export const createGroupChat = asyncHandler(async (req, res) => {
  const { name, members, admins = [] } = req.body;

  if (!name || !members?.length) {
    throw new ApiError(400, "Group name and members required");
  }

  const room = await ChatRoom.create({
    companyId: req.user.companyId,
    type: "GROUP",
    name,
    members: [...new Set([...members, req.user._id])],
    admins: [...new Set([...admins, req.user._id])],
    createdBy: req.user._id
  });

  res.status(201).json({
    message: "Group created",
    data: room
  });
});


export const getMyChatRooms = asyncHandler(async (req, res) => {
  const rooms = await ChatRoom.find({
    companyId: req.user.companyId,
    $or: [
      { members: req.user._id },
      { exitedMembers: req.user._id }
    ]
  })
    .populate("members", "name employeeId photo isOnline")
    .populate("exitedMembers", "name photo")
    .sort({ updatedAt: -1 });

  res.status(200).json({
    data: rooms
  });
});





export const sendMessage = asyncHandler(async (req, res) => {
  const { roomId, text, parentMessageId, tempId } = req.body;

  if (!roomId || !text) {
    throw new ApiError(400, "Room and message required");
  }

  const room = await ChatRoom.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found");

  const isCurrentMember = room.members.some(m => String(m) === String(req.user._id));
  const isExitedMember = room.exitedMembers?.some(m => String(m) === String(req.user._id));

  if (isExitedMember) {
    throw new ApiError(403, "You have left this group and can no longer send messages");
  }

  if (!isCurrentMember) {
    throw new ApiError(403, "Not a room member");
  }

  const message = await Message.create({
    companyId: req.user.companyId,
    roomId,
    senderId: req.user._id,
    text,
    parentMessage: parentMessageId,
    seenBy: [req.user._id],
    deliveryStatus: "SENT"
  });

  const populatedMessage = await Message.findById(message._id)
    .populate("senderId", "name employeeId")
    .populate({
      path: "parentMessage",
      populate: { path: "senderId", select: "name" }
    });

  room.lastMessage = {
    messageId: message._id,
    text,
    senderId: req.user._id,
    sentAt: new Date(),
    deliveryStatus: "SENT"
  };
  room.updatedAt = new Date(); // Explicitly touch updatedAt for sorting
  await room.save();


  const io = req.app.get("io");
  const emitData = {
    roomId,
    message: { ...populatedMessage.toObject(), tempId }
  };

  io.to(roomId.toString()).emit("newMessage", emitData);

  // Also emit to all members individually to ensure delivery even if they haven't joined the room yet
  room.members.forEach(memberId => {
    io.to(`user:${memberId.toString()}`).emit("newMessage", emitData);
  });

  res.status(201).json({
    data: { ...populatedMessage.toObject(), tempId }
  });
});



export const getMessages = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { limit = 30, before } = req.query;

  const query = {
    roomId,
    deletedFor: { $ne: req.user._id }
  };

  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const messages = await Message.find(query)
    .populate("senderId", "name employeeId")
    .populate({
      path: "parentMessage",
      populate: { path: "senderId", select: "name" }
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    data: messages.reverse()
  });
});

export const markMessagesAsSeen = asyncHandler(async (req, res) => {
  const { roomId } = req.body;

  if (!roomId) {
    throw new ApiError(400, "Room required");
  }

  await Message.updateMany(
    {
      roomId,
      senderId: { $ne: req.user._id },
      seenBy: { $ne: req.user._id }
    },
    {
      $set: { deliveryStatus: "SEEN" },
      $addToSet: { seenBy: req.user._id }
    }
  );

  // Sync the lastMessage status in ChatRoom if applicable
  await ChatRoom.updateOne(
    { _id: roomId, "lastMessage.senderId": { $ne: req.user._id } },
    { $set: { "lastMessage.deliveryStatus": "SEEN" } }
  );

  const roomIdStr = roomId.toString();
  const io = req.app.get("io");
  io.to(roomIdStr).emit("updateMessageStatus", { roomId: roomIdStr, status: "SEEN" });
  io.to(roomIdStr).emit("messagesSeen", { roomId: roomIdStr, userId: req.user._id });

  // BULLETPROOF: Also notify all members individually to ensure delivery to background/list views
  const currentRoom = await ChatRoom.findById(roomId);
  if (currentRoom) {
    currentRoom.members.forEach(mId => {
      const userRoom = `user:${mId.toString()}`;
      io.to(userRoom).emit("updateMessageStatus", { roomId: roomIdStr, status: "SEEN" });
      io.to(userRoom).emit("messagesSeen", { roomId: roomIdStr, userId: req.user._id });
    });
  }

  res.status(200).json({
    message: "Messages marked as seen"
  });
});

export const getRoomDetails = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await ChatRoom.findById(roomId)
    .populate("members", "name photo isOnline lastActiveAt")
    .populate("createdBy", "name");

  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  res.status(200).json({
    data: room
  });
});

export const getUnreadCounts = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const rooms = await ChatRoom.find({
    companyId: req.user.companyId,
    members: userId
  });

  const results = await Promise.all(
    rooms.map(async (room) => {
      const count = await Message.countDocuments({
        roomId: room._id,
        senderId: { $ne: userId },
        seenBy: { $ne: userId }
      });

      return {
        roomId: room._id,
        unreadCount: count
      };
    })
  );

  res.status(200).json({
    data: results
  });
});


export const editMessage = asyncHandler(async (req, res) => {
  const { messageId, text } = req.body;

  const message = await Message.findOne({
    _id: messageId,
    senderId: req.user._id
  });

  if (!message) {
    throw new ApiError(403, "Not allowed");
  }

  message.text = text;
  message.editedAt = new Date();
  await message.save();

  const io = req.app.get("io");
  io.to(message.roomId.toString()).emit("messageEdited", message);

  res.status(200).json({ data: message });
});


export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.body;

  const message = await Message.findOne({
    _id: messageId,
    senderId: req.user._id
  });

  if (!message) {
    throw new ApiError(403, "Not allowed");
  }

  message.isDeleted = true;
  await message.save();

  const io = req.app.get("io");
  io.to(message.roomId.toString()).emit("messageDeleted", {
    messageId
  });

  res.status(200).json({ message: "Deleted" });
});

// s3
// export const sendFileMessage = asyncHandler(async (req, res) => {
//   const { roomId } = req.body;

//   if (!req.file) {
//     throw new ApiError(400, "File required");
//   }

//   const message = await Message.create({
//     companyId: req.user.companyId,
//     roomId,
//     senderId: req.user._id,
//     type: req.file.mimetype.startsWith("image/")
//       ? "IMAGE"
//       : req.file.mimetype.startsWith("audio/")
//       ? "VOICE"
//       : "FILE",
//     fileUrl: req.file.location,
//     fileName: req.file.originalname,
//     fileSize: req.file.size,
//     mimeType: req.file.mimetype,
//     duration: req.body.duration || null,
//     seenBy: [req.user._id]
//   });

//   io.to(roomId.toString()).emit("newMessage", message);

//   res.status(201).json({ data: message });
// });



export const sendFileMessage = asyncHandler(async (req, res) => {
  const { roomId, tempId } = req.body;

  if (!req.file) {
    throw new ApiError(400, "File required");
  }

  const fileUrl = `/uploads/chats/${req.file.filename}`;

  const message = await Message.create({
    companyId: req.user.companyId,
    roomId,
    senderId: req.user._id,
    type: req.file.mimetype.startsWith("image/")
      ? "IMAGE"
      : req.file.mimetype.startsWith("audio/")
        ? "VOICE"
        : "FILE",
    fileUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    duration: req.body.duration || null,
    seenBy: [req.user._id]
  });

  const populated = await Message.findById(message._id).populate("senderId", "name employeeId");

  const io = req.app.get("io");
  const emitData = {
    roomId,
    message: { ...populated.toObject(), tempId }
  };

  io.to(roomId.toString()).emit("newMessage", emitData);

  const room = await ChatRoom.findById(roomId);
  if (room) {
    room.lastMessage = {
      messageId: message._id,
      text: message.type, 
      senderId: req.user._id,
      sentAt: new Date(),
      deliveryStatus: "SENT"
    };
    room.updatedAt = new Date();
    await room.save();

    room.members.forEach(memberId => {
      io.to(`user:${memberId.toString()}`).emit("newMessage", emitData);
    });
  }

  res.status(201).json({ data: { ...populated.toObject(), tempId } });
});

export const getChatUsers = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user._id)
    .populate("roleId");

  const currentLevel = currentUser.roleId.level;

  const rolesBelow = await Role.find({
    companyId: req.user.companyId,
    // level: { $gt: currentLevel } // lower hierarchy
  });

  const roleIds = rolesBelow.map(r => r._id);

  const users = await User.find({
    companyId: req.user.companyId,
    roleId: { $in: roleIds },
    isActive: true
  }).select("name employeeId roleId");

  res.status(200).json({ data: users });
});

export const deleteMessages = asyncHandler(async (req, res) => {
  const { messageIds, roomId, mode } = req.body; // mode: 'ME' | 'EVERYONE'

  if (!messageIds || !Array.isArray(messageIds)) {
    throw new ApiError(400, "Message IDs required");
  }

  if (mode === 'EVERYONE') {
    await Message.updateMany(
      { _id: { $in: messageIds }, senderId: req.user._id },
      { isDeleted: true, text: "This message was deleted" }
    );
    if (roomId) {
      const io = req.app.get("io");
      io.to(roomId.toString()).emit("messagesDeleted", { messageIds, roomId });
    }
  } else {
    // Delete for ME
    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $addToSet: { deletedFor: req.user._id } }
    );
  }

  res.status(200).json({
    message: "Messages deleted successfully"
  });
});

export const forwardMessages = asyncHandler(async (req, res) => {
  const { messageIds, targetRoomIds } = req.body;

  if (!messageIds || !targetRoomIds || !Array.isArray(messageIds) || !Array.isArray(targetRoomIds)) {
    throw new ApiError(400, "Message IDs and target room IDs are required");
  }

  const messagesToForward = await Message.find({ _id: { $in: messageIds } });

  for (const roomId of targetRoomIds) {
    for (const msg of messagesToForward) {
      const newMsg = await Message.create({
        companyId: req.user.companyId,
        roomId,
        senderId: req.user._id,
        type: msg.type,
        text: msg.text,
        fileUrl: msg.fileUrl,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        mimeType: msg.mimeType,
        location: msg.location,
        isForwarded: true,
        seenBy: [req.user._id],
        deliveryStatus: "SENT"
      });

      const populated = await Message.findById(newMsg._id).populate("senderId", "name employeeId");

      const io = req.app.get("io");
      io.to(roomId).emit("newMessage", {
        roomId,
        message: populated
      });
      io.to(`user:${req.user._id}`).emit("newMessage", { roomId, message: populated }); // Notification to receiver channel too if it was me
      // Actually forward should notify targets
      // targetRoomIds logic is complex, should ideally iterate members of targets or just use roomId
      // Since roomId is a targetRoomId here
      const targetRoom = await ChatRoom.findById(roomId);
      if (targetRoom) {
        targetRoom.members.forEach(mId => io.to(`user:${mId.toString()}`).emit("newMessage", { roomId, message: populated }));
      }
    }
  }

  res.status(200).json({ message: "Messages forwarded successfully" });
});

export const reactToMessage = asyncHandler(async (req, res) => {
  const { messageId, emoji, roomId } = req.body;

  if (!messageId || !emoji) {
    throw new ApiError(400, "Message ID and emoji are required");
  }

  const message = await Message.findById(messageId);
  if (!message) throw new ApiError(404, "Message not found");

  // Remove existing reaction if it's the same emoji, or update it
  const existingIndex = message.reactions.findIndex(r => r.userId.toString() === req.user._id.toString());

  if (existingIndex > -1) {
    if (message.reactions[existingIndex].emoji === emoji) {
      message.reactions.splice(existingIndex, 1); // remove if click again
    } else {
      message.reactions[existingIndex].emoji = emoji; // update
    }
  } else {
    message.reactions.push({ userId: req.user._id, emoji });
  }

  await message.save();

  if (roomId) {
    const io = req.app.get("io");
    io.to(roomId.toString()).emit("messageReaction", { messageId, reactions: message.reactions, roomId });
  }

  res.status(200).json({ data: message.reactions });
});

export const leaveGroup = asyncHandler(async (req, res) => {
  const { roomId } = req.body;
  const userId = req.user._id;

  const room = await ChatRoom.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found");

  // Move from members to exitedMembers instead of removing
  room.members = room.members.filter(m => String(m) !== String(userId));
  if (!room.exitedMembers.some(m => String(m) === String(userId))) {
    room.exitedMembers.push(userId);
  }
  room.admins = room.admins.filter(m => String(m) !== String(userId));

  if (room.type === "GROUP" && room.admins.length === 0 && room.members.length > 0) {
    room.admins.push(room.members[0]);
  }

  await room.save();

  // Create SYSTEM message
  const leavingUser = await User.findById(userId);
  const sysMsg = await Message.create({
    companyId: req.user.companyId,
    roomId,
    senderId: userId, // associate with the user who left
    type: "SYSTEM",
    text: `${leavingUser?.name || "A user"} left the group`,
    seenBy: [userId],
    deliveryStatus: "SENT"
  });

  const io = req.app.get("io");
  io.to(roomId).emit("userLeft", { roomId, userId });
  io.to(roomId).emit("newMessage", { roomId, message: sysMsg });

  res.status(200).json({ message: "Left group successfully" });
});

export const removeMember = asyncHandler(async (req, res) => {
  const { roomId, userIdToRemove } = req.body;

  const room = await ChatRoom.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found");

  const isAdmin = room.admins.some(a => String(a) === String(req.user._id));
  if (!isAdmin) throw new ApiError(403, "Admin privileges required");

  // Move from members to exitedMembers
  room.members = room.members.filter(m => String(m) !== String(userIdToRemove));
  if (!room.exitedMembers.some(m => String(m) === String(userIdToRemove))) {
    room.exitedMembers.push(userIdToRemove);
  }
  room.admins = room.admins.filter(a => String(a) !== String(userIdToRemove));

  await room.save();

  // Create SYSTEM message
  const removedUser = await User.findById(userIdToRemove);
  const sysMsg = await Message.create({
    companyId: req.user.companyId,
    roomId,
    senderId: req.user._id, // admin who removed
    type: "SYSTEM",
    text: `${removedUser?.name || "A user"} was removed by admin`,
    seenBy: [req.user._id],
    deliveryStatus: "SENT"
  });

  const io = req.app.get("io");
  io.to(roomId).emit("userKicked", { roomId, userId: userIdToRemove });
  io.to(roomId).emit("newMessage", { roomId, message: sysMsg });

  res.status(200).json({ message: "Member removed successfully" });
});

export const toggleAdminStatus = asyncHandler(async (req, res) => {
  const { roomId, targetUserId } = req.body;

  const room = await ChatRoom.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found");

  const isAdmin = room.admins.some(a => String(a) === String(req.user._id));
  if (!isAdmin) throw new ApiError(403, "Admin privileges required");

  const isAlreadyAdmin = room.admins.some(a => String(a) === String(targetUserId));

  if (isAlreadyAdmin) {
    if (room.admins.length <= 1) throw new ApiError(400, "Group must have at least one admin");
    room.admins = room.admins.filter(a => String(a) !== String(targetUserId));
  } else {
    room.admins.push(targetUserId);
  }

  await room.save();

  const io = req.app.get("io");
  io.to(roomId).emit("adminStatusUpdated", { roomId, targetUserId, isAdmin: !isAlreadyAdmin });

  res.status(200).json({ message: "Admin status updated", isAdmin: !isAlreadyAdmin });
});

export const updateGroupDetails = asyncHandler(async (req, res) => {
  const { roomId, name } = req.body;

  const room = await ChatRoom.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found");

  const isAdmin = room.admins.some(a => String(a) === String(req.user._id));
  if (!isAdmin) throw new ApiError(403, "Admin privileges required");

  if (name) room.name = name;
  await room.save();

  const io = req.app.get("io");
  io.to(roomId).emit("groupUpdated", { roomId, name: room.name });

  res.status(200).json({ data: room });
});

export const updateGroupPhoto = asyncHandler(async (req, res) => {
  const { roomId } = req.body;

  if (!req.file) throw new ApiError(400, "Photo required");

  const room = await ChatRoom.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found");

  const isAdmin = room.admins.some(a => String(a) === String(req.user._id));
  if (!isAdmin) throw new ApiError(403, "Admin privileges required");

  room.photo = `/uploads/chats/${req.file.filename}`;
  await room.save();

  const io = req.app.get("io");
  io.to(roomId).emit("groupUpdated", { roomId, photo: room.photo });

  res.status(200).json({ data: room });
});

export const addMembers = asyncHandler(async (req, res) => {
  const { roomId, memberIds } = req.body;

  const room = await ChatRoom.findById(roomId);
  if (!room) throw new ApiError(404, "Room not found");

  const isAdmin = room.admins.some(a => String(a) === String(req.user._id));
  if (!isAdmin) throw new ApiError(403, "Admin privileges required");

  const io = req.app.get("io");

  for (const userId of memberIds) {
    // If user is in exitedMembers, move them back
    if (room.exitedMembers && room.exitedMembers.some(m => String(m) === String(userId))) {
      room.exitedMembers = room.exitedMembers.filter(m => String(m) !== String(userId));
    }
    
    // Add to members if not already there
    if (!room.members.some(m => String(m) === String(userId))) {
      room.members.push(userId);
      
      const user = await User.findById(userId).select("name");

      // Create system message
      const sysMsg = await Message.create({
        companyId: req.user.companyId,
        roomId,
        senderId: req.user._id, // Admin who added them
        type: "SYSTEM",
        text: `${req.user.name} added ${user?.name || "a user"} to the group`,
        seenBy: [req.user._id],
        deliveryStatus: "SENT"
      });
      
      io.to(roomId).emit("newMessage", { roomId, message: sysMsg });
    }
  }

  await room.save();
  io.to(roomId).emit("membersAdded", { roomId, memberIds });

  res.status(200).json({ data: room });
});

export const initChatWindow = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await ChatRoom.findById(roomId)
    .populate("members", "name photo isOnline lastActiveAt")
    .populate("exitedMembers", "name photo");

  if (!room) throw new ApiError(404, "Room not found");

  // Multi-step optimization: Get initial messages and mark as seen
  const [messages] = await Promise.all([
    Message.find({
      roomId,
      deletedFor: { $ne: req.user._id }
    })
      .populate("senderId", "name employeeId")
      .populate({
        path: "parentMessage",
        populate: { path: "senderId", select: "name" }
      })
      .sort({ createdAt: -1 })
      .limit(30),

    // Background task: Mark as seen
    Message.updateMany(
      {
        roomId,
        senderId: { $ne: req.user._id },
        seenBy: { $ne: req.user._id }
      },
      {
        $set: { deliveryStatus: "SEEN" },
        $addToSet: { seenBy: req.user._id }
      }
    ),

    // Sync ChatRoom lastMessage status
    ChatRoom.updateOne(
      { _id: roomId, "lastMessage.senderId": { $ne: req.user._id } },
      { $set: { "lastMessage.deliveryStatus": "SEEN" } }
    )
  ]);

  // Notify other participants that messages were seen
  const io = req.app.get("io");
  const roomIdStr = roomId.toString();
  io.to(roomIdStr).emit("updateMessageStatus", { roomId: roomIdStr, status: "SEEN", userId: req.user._id });
  io.to(roomIdStr).emit("messagesSeen", { roomId: roomIdStr, userId: req.user._id });

  // Safety: Also notify users' private rooms
  room.members.forEach(mId => {
    io.to(`user:${mId.toString()}`).emit("updateMessageStatus", { roomId: roomIdStr, status: "SEEN", userId: req.user._id });
  });

  res.status(200).json({
    data: {
      room,
      messages: messages.reverse()
    }
  });
});

/**
 * @desc Send a meeting link to entire reporting chain
 * @route POST /api/chat/meeting
 */
export const sendMeetingMessage = asyncHandler(async (req, res) => {
  const { title, details, zoomLink, date, roomId } = req.body;
  const managerId = req.user._id;

  if (!title || !zoomLink || !roomId) {
    throw new ApiError(400, "Title, zoomLink, and roomId are required");
  }

  // 1. Check Permission (Subscription check)
  const user = await User.findById(managerId).populate({
    path: 'companyId',
    populate: { path: 'plan' }
  });
  
  const plan = user?.companyId?.plan;
  const autoChatEnabled = plan?.permissions?.includes("internalChat") || plan?.features?.includes("internalChat");
  
  if (!autoChatEnabled) {
    throw new ApiError(403, "Internal Chat features not enabled for your company");
  }

  // 2. Find entire team (Chain)
  const results = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(managerId) } },
    {
      $graphLookup: {
        from: "users",
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "managerId",
        as: "descendants"
      }
    }
  ]);

  const descendants = results[0]?.descendants || [];
  const descendantIds = descendants.map(d => d._id);

  // 3. Create the MEETING message in the group
  const message = await Message.create({
    companyId: req.user.companyId,
    roomId,
    senderId: managerId,
    type: "MEETING",
    text: `📅 Meeting: ${title}`,
    meetingMetadata: {
      title,
      details,
      zoomLink,
      date: date ? new Date(date) : new Date(),
      isCanceled: false
    },
    seenBy: [managerId],
    deliveryStatus: "SENT"
  });

  // 4. Notification & Socket Emit
  const io = req.app.get("io");
  const populated = await Message.findById(message._id).populate("senderId", "name photo");

  const emitData = { roomId, message: populated };
  io.to(roomId.toString()).emit("newMessage", emitData);

  // Notify everyone in the chain via Push (using createNotification)
  // We already have a notification controller, but we can also use Push directly
  // For now, let's assume we handle Push in the frontend or via common util
  
  res.status(201).json({
    message: "Meeting broadcasted to chain",
    data: populated
  });
});

/**
 * @desc Cancel a meeting message
 * @route PATCH /api/chat/meeting/:id/cancel
 */
export const cancelMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const originalMessage = await Message.findOne({ _id: id, senderId: req.user._id });
  if (!originalMessage) throw new ApiError(404, "Meeting message not found or unauthorized");

  originalMessage.meetingMetadata.isCanceled = true;
  await originalMessage.save();

  // Create "Cancellation" Reply
  const cancelMsg = await Message.create({
    companyId: req.user.companyId,
    roomId: originalMessage.roomId,
    senderId: req.user._id,
    type: "SYSTEM",
    text: `🚫 MEETING CANCELED: ${originalMessage.meetingMetadata.title}`,
    parentMessage: originalMessage._id,
    seenBy: [req.user._id],
    deliveryStatus: "SENT"
  });

  const populatedCancel = await Message.findById(cancelMsg._id).populate("senderId", "name");

  const io = req.app.get("io");
  io.to(originalMessage.roomId.toString()).emit("newMessage", {
    roomId: originalMessage.roomId,
    message: populatedCancel
  });
  io.to(originalMessage.roomId.toString()).emit("messageUpdated", originalMessage); // Update the original status

  res.status(200).json({
    message: "Meeting canceled",
    data: populatedCancel
  });
});