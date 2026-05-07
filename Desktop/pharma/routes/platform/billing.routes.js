import express from "express";
import * as billingController from "../../controllers/platform/billing.controller.js";
import { protect, verifyPlatformAdmin } from "../../middleware/auth.middleware.js";

const router = express.Router();

// All billing entity routes require platform admin verification
router.use(protect);
router.use(verifyPlatformAdmin);

router.post("/", billingController.createBillingEntity);
router.get("/", billingController.getBillingEntities);
router.put("/:id", billingController.updateBillingEntity);
router.delete("/:id", billingController.deleteBillingEntity);

export default router;
