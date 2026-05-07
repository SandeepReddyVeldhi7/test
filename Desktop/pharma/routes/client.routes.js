import express from "express";
import {
  createClient,
  getClients,
  updateClient,
  exportClients,
  deleteClient
} from "../controllers/client.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { createUploader } from "../middleware/upload.middleware.js";


const router = express.Router();
const upload = createUploader("clients");

router.get("/export", protect, exportClients);

router.post(
  "/",
  protect,
  upload.single("photo"),
  createClient
);

router.get("/", protect, getClients);
router.delete("/:id", protect, deleteClient);
router.patch(
  "/:id",
  protect,
  upload.single("photo"),
  updateClient
);
export default router;
