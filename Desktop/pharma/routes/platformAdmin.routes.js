import express from "express";
import { createPlatformOwner } from "../controllers/platformAdmin.controller.js";
import { ownerSetupGuard } from "../middleware/ownerSetupGuard.js";

const router = express.Router();


router.post("/create-owner", ownerSetupGuard, createPlatformOwner);

export default router;
