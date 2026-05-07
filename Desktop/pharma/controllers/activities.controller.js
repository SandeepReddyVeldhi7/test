

import { getDistance } from "geolib";
import { ActivityLog, Client, User } from "../models/index.js";
import { createNotification } from "./notification.controller.js";
import { getISTBoundaries } from "../utils/DateUtils.js";


export const createActivity = async (req, res) => {
    try {
        const {
            clientId,
            designation,
            area,
            action,
            latitude,
            longitude,
            address,
            isDeviation,
            deviationReason,
            workType,
            remarks,
            category,
            status,
            clientInterest
        } = req.body;


        const isFieldWork = ["FIELD", "JOINT_WORK", "OUT_OF_STATION"].includes(workType || "FIELD");

        if (isFieldWork && !clientId) {
            return res.status(400).json({ message: "Client selection is required for field work" });
        }

        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Location coordinates are required" });
        }

        // ✅ DISTANCE CHECK (Only if client is selected)
        if (clientId) {
            const client = await Client.findById(clientId);

            if (!client || !client.location) {
                return res.status(404).json({ message: "Client location not found" });
            }

            const distance = getDistance(
                { latitude: Number(latitude), longitude: Number(longitude) },
                {
                    latitude: client.location.latitude,
                    longitude: client.location.longitude,
                }
            );

            const MAX_DISTANCE = 100;

            if (distance > MAX_DISTANCE) {
                return res.status(400).json({
                    success: false,
                    message: `Too far (${distance}m away from client location)`,
                });
            }

            // ✅ CHECK DAILY LIMIT FOR THIS CLIENT (Business Day in IST)
            const { startOfDay, endOfDay } = getISTBoundaries();

            const existingActivity = await ActivityLog.findOne({
                userId: req.user._id,
                clientId,
                timestamp: { $gte: startOfDay, $lte: endOfDay },
            });

            if (existingActivity) {
                return res.status(400).json({
                    success: false,
                    message: "Activity already submitted for this client today",
                });
            }
        }

        const activity = await ActivityLog.create({
            companyId: req.user.companyId,
            userId: req.user._id,
            clientId,
            designation,
            area,
            action: action || "DCR",
            location: {
                latitude,
                longitude,
                address,
            },
            photo: req.file ? `/uploads/activities/${req.file.filename}` : null,
            isDeviation: isDeviation || false,
            deviationReason: deviationReason || "",
            workType: workType || "FIELD",
            remarks: remarks || "",
            // timestamp defaults to now
            category,
            status,
            clientInterest
        });

        // ✅ UPDATE CLIENT INTEREST IN MASTER RECORD
        if (clientId && clientInterest) {
            await Client.findByIdAndUpdate(clientId, { clientInterest });
        }

        // 🔔 Notify Manager — Local DCR Submission
        if (req.user.managerId && (action === "DCR" || !action)) {
            await createNotification({
                companyId: req.user.companyId,
                recipientId: req.user.managerId,
                category: "ACTIVITY",
                title: "New DCR Submitted",
                body: `${req.user.name} submitted a new activity report for ${new Date().toLocaleDateString()}.`,
                relatedUserId: req.user._id,
                redirectTo: "DCRApproval",
                metadata: { activityId: activity._id.toString(), userId: req.user._id.toString() }
            });
        }


        res.status(201).json({
            success: true,
            message: "Activity created successfully",
            data: activity,
        });

    } catch (error) {
        console.error("CREATE ACTIVITY ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create activity",
        });
    }
};

// ✅ GET ACTIVITIES
export const getActivities = async (req, res) => {
    try {
        const { companyId, userId, clientId } = req.query;

        if (!companyId || !userId) {
            return res.status(400).json({ message: "companyId & userId required" });
        }

        const query = { companyId, userId };
        if (clientId) {
            query.clientId = clientId;
        }

        // Add Today's filtering logic
        const { today } = req.query;
        if (today === "true") {
            const { startOfDay, endOfDay } = getISTBoundaries();
            query.timestamp = { $gte: startOfDay, $lte: endOfDay };
        }

        const activities = await ActivityLog.find(query)
            .populate("clientId", "name designation area photo")
            .sort({ timestamp: -1 });
        console.log("Activities:", activities);
        res.status(200).json({
            success: true,
            data: activities,
        });
    } catch (error) {
        console.error("GET ACTIVITIES ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch activities",
        });
    }
};