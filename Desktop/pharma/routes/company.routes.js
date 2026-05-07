import express from "express";
import { 
  createCompany, 
  getSalaryStructure, 
  updateSalaryStructure,
  getCompanyDetails,
  updateCompany
} from "../controllers/company.controller.js";
import { ownerSetupGuard } from "../middleware/ownerSetupGuard.js";
import { protect } from "../middleware/auth.middleware.js";
import { createUploader } from "../middleware/upload.middleware.js";

const router = express.Router();
const upload = createUploader("createcompany");

router.post("/", protect, upload.single("logoUrl"), createCompany);
router.get("/salary-structure", protect, getSalaryStructure);
router.patch("/salary-structure", protect, updateSalaryStructure);
router.get("/details", protect, getCompanyDetails);
router.patch("/", protect, upload.single("logoUrl"), updateCompany);

export default router;
