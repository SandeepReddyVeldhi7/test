import { Client, Company, Territory, User, ClientAudit } from "../models/index.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { createNotification } from "./notification.controller.js";

export const createClient = asyncHandler(async (req, res) => {
  const {
    type,
    name,
    territoryId,
    priority,
    dob,
    anniversary,
    remarks,
    location,
    designation,
    area,
    station,
    specialDateType,
    clientInterest,
    status
  } = req.body;

  // ✅ parse location
  let parsedLocation = location;
  if (typeof location === "string") {
    parsedLocation = JSON.parse(location);
  }

  if (!name || !type) {
    throw new ApiError(400, "Type and name are required");
  }

  if (type === "doctor" && !designation) {
    throw new ApiError(400, "Designation is required for doctor");
  }

  const company = await Company.findById(req.user.companyId);
  if (!company || company.status !== "ACTIVE") {
    throw new ApiError(403, "Company not active");
  }

  // if (territoryId) {
  //   const territory = await Territory.findOne({
  //     _id: territoryId,
  //     companyId: req.user.companyId
  //   });

  //   if (!territory) {
  //     throw new ApiError(400, "Invalid territory");
  //   }
  // }
  if (!clientInterest) {
    throw new ApiError(400, "Client interest is required");
  }

  if (parsedLocation?.lat == null || parsedLocation?.lng == null) {
    throw new ApiError(400, "Location is required");
  }

  // ✅ LOCAL UPLOAD
  let photo = null;
  if (req.file) {
    photo = `/uploads/clients/${req.file.filename}`;
  }

  console.log("photo", photo);
  // ✅ S3 (COMMENTED - reusable)
  /*
  if (req.file) {
    photo = await uploadToS3(req.file, "clients");
  }
  */

  const client = await Client.create({
    companyId: req.user.companyId,
    employeeId: req.user._id,
    clientType: type,
    name,
    territoryId,
    priority,
    dob,
    anniversary,
    remarks,
    location: {
      latitude: parsedLocation.lat,
      longitude: parsedLocation.lng,
      address: parsedLocation.address
    },
    photo: photo,
    designation,
    area,
    station,
    specialDateType,
    clientInterest,
    status: status || "active",
    createdBy: req.user._id
  });

  res.status(201).json({
    message: "Client created successfully",
    data: client
  });
});



// export const getClients = asyncHandler(async (req, res) => {
//   const {
//     territoryId,
//     type,
//     createdBy,
//     employeeId
//   } = req.query;

//   const filter = {
//     companyId: req.user.companyId
//   };


//   if (createdBy) {
//     filter.createdBy = createdBy;
//   }

//   if (employeeId) {
//     const user = await User.findOne({
//       employeeId,
//       companyId: req.user.companyId
//     });

//     if (!user) {
//       throw new ApiError(404, "Employee not found");
//     }

//     filter.createdBy = user._id;
//   }


//   if (territoryId) filter.territoryId = territoryId;
//   if (type) filter.type = type;

//   const clients = await Client.find(filter)
//     .populate("territoryId", "name type")
//     .populate("createdBy", "name employeeId")
//     .sort({ createdAt: -1 });
//   console.log("Clients:", clients);
//   res.status(200).json({
//     count: clients.length,
//     data: clients
//   });
// });

export const getClients = asyncHandler(async (req, res) => {
  const { search, status, priority } = req.query;

  // Enforce SaaS Isolation & Ownership
  const filter = {
    companyId: req.user.companyId,
    createdBy: req.user._id,
    status: status || "active"
  };

  if (priority) {
    filter.priority = priority;
  }

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const clients = await Client.find(filter)
    .select("_id name designation priority status clientType dob anniversary specialDateType area location clientInterest photo")
    .sort({ name: 1 })
    .lean();

  res.status(200).json({ data: clients });
});


export const deleteClient = asyncHandler(async (req, res) => {
  const clientId = req.params.id;

  const client = await Client.findOne({
    _id: clientId,
    companyId: req.user.companyId
  });

  if (!client) {
    throw new ApiError(404, "Client not found");
  }

  // Soft Delete
  client.status = "inactive";
  await client.save();

  res.status(200).json({
    success: true,
    message: "Client deleted successfully"
  });
});



export const updateClient = asyncHandler(async (req, res) => {
  const clientId = req.params.id;
  console.log("Updating Client ID:", clientId);
  console.log("Body:", req.body);

  try {
    const client = await Client.findOne({
      _id: clientId,
      companyId: req.user.companyId
    });

    if (!client) {
      throw new ApiError(404, "Client not found");
    }

    if (client.createdBy && client.createdBy.toString() !== req.user._id.toString()) {
      const currentUser = await User.findById(req.user._id).populate("roleId");
      const creator = await User.findById(client.createdBy).populate("roleId");

      if (!creator || !currentUser) {
        throw new ApiError(403, "Access unauthorized");
      }

      // Safeguard for roleId or level being missing
      const viewerLevel = currentUser.roleId?.level || 99;
      const ownerLevel = creator.roleId?.level || 99;

      if (viewerLevel >= ownerLevel && currentUser._id.toString() !== client.createdBy.toString()) {
        throw new ApiError(403, "Insufficient permissions to edit this client record");
      }
    }

    const {
      type,
      name,
      territoryId,
      priority,
      dob,
      anniversary,
      location,
      designation,
      area,
      station,
      specialDateType,
      clientInterest,
      status
    } = req.body;

    // ✅ parse location
    let parsedLocation = location;
    if (typeof location === "string" && location.trim() !== "") {
      try {
        parsedLocation = JSON.parse(location);
      } catch (e) {
        console.error("Location parse error:", e);
      }
    }

    if (territoryId) {
      const territory = await Territory.findOne({
        _id: territoryId,
        companyId: req.user.companyId
      });
      if (territory) client.territoryId = territoryId;
    }

    if (type) client.clientType = type;
    if (name) client.name = name;

    // Audit Logging and Conditional Status Logic
    const priorityChanged = priority && priority !== client.priority;
    const effectiveStatus = priority === "UL" ? "active" : (status || client.status);
    const statusChanged = effectiveStatus !== client.status;

    if (priorityChanged || (client.priority === "L" && statusChanged)) {
      // Create Audit Log
      await ClientAudit.create({
        companyId: req.user.companyId,
        clientId: client._id,
        userId: req.user._id,
        oldPriority: client.priority,
        newPriority: priority || client.priority,
        oldStatus: client.status,
        newStatus: effectiveStatus
      });
    }

    if (priority) client.priority = priority;
    client.status = effectiveStatus;

    if (dob) client.dob = dob;
    if (anniversary) client.anniversary = anniversary;
    if (specialDateType) client.specialDateType = specialDateType;
    if (designation) client.designation = designation;
    if (area) client.area = area;
    if (station) client.station = station;
    if (clientInterest) client.clientInterest = clientInterest;

    if (parsedLocation && parsedLocation.lat != null && parsedLocation.lng != null) {
      client.location = {
        latitude: Number(parsedLocation.lat),
        longitude: Number(parsedLocation.lng),
        address: parsedLocation.address || ""
      };
    }

    if (req.file) {
      client.photo = `/uploads/clients/${req.file.filename}`;
    }

    await client.save();
    console.log("Client updated successfully");

    res.status(200).json({
      success: true,
      message: "Client updated successfully",
      data: client
    });
  } catch (error) {
    console.error("Update Client Error:", error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, error.message || "Failed to update client");
  }
});

export const exportClients = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = req.query;

  const filter = {};
  if (req.user?.companyId) {
    filter.companyId = req.user.companyId;
  } else if (companyId) {
    filter.companyId = companyId;
  }

  if (employeeId) {
    filter.employeeId = employeeId;
  }

  const clients = await Client.find(filter)
    .populate("territoryId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const exceljs = await import('exceljs');
  const workbook = new exceljs.default.Workbook();
  const sheet = workbook.addWorksheet('Clients Data');

  sheet.columns = [
    { header: 'Client Name', key: 'name', width: 25 },
    { header: 'Type', key: 'clientType', width: 15 },
    { header: 'Designation', key: 'designation', width: 20 },
    { header: 'Priority (Listed/Unlisted)', key: 'priority', width: 20 },
    { header: 'Area/Location', key: 'area', width: 20 },
    { header: 'Special Date', key: 'specialDateType', width: 15 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Remarks', key: 'remarks', width: 30 }
  ];

  sheet.getRow(1).font = { bold: true };

  clients.forEach(c => {
    let dateStr = "";
    if (c.specialDateType === 'birthday' && c.dob) {
      dateStr = new Date(c.dob).toLocaleDateString('en-GB');
    } else if (c.specialDateType === 'anniversary' && c.anniversary) {
      dateStr = new Date(c.anniversary).toLocaleDateString('en-GB');
    }

    sheet.addRow({
      name: c.name || 'N/A',
      clientType: c.clientType || 'N/A',
      designation: c.designation || 'N/A',
      priority: c.priority === 'L' ? 'Listed' : 'Un Listed',
      area: c.area || c.location?.address || 'N/A',
      specialDateType: c.specialDateType || 'N/A',
      date: dateStr,
      remarks: c.remarks || ''
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const base64Data = buffer.toString('base64');

  res.status(200).json({
    success: true,
    data: base64Data,
    filename: 'Clients_Data.xlsx'
  });
});
