import express from "express";
import { 
  getAllCompanies, 
  getCompanyDetails, 
  toggleCompanyStatus, 
  getUserInsights,
  getCompanyBills,
  renewSubscription,
  upgradeSubscription,
  grantFreeTrial,
  onboardCompany,
  markBillAsPaid,
  downloadBillPDF,
  getPlatformStats
} from "../../controllers/platform/company.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect); // All company routes are protected

router.get("/stats", getPlatformStats);
router.get("/", getAllCompanies);
router.post("/onboard", onboardCompany);
router.get("/:id", getCompanyDetails);
router.patch("/:id/toggle-status", toggleCompanyStatus);
router.get("/:id/users/:userId", getUserInsights);

// Subscription Management Routes
router.get("/:id/bills", getCompanyBills);
router.post("/:id/renew", renewSubscription);
router.post("/:id/upgrade", upgradeSubscription);
router.post("/:id/free-trial", grantFreeTrial);
router.patch("/bills/:billId/pay", markBillAsPaid);
router.get("/bills/:billId/download", downloadBillPDF);

export default router;
