import express from "express";
import {
  createRole,
  getRoles,
  updateRole,
  deleteRole,
  getUsersByRole
} from "../controllers/role.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";



const router = express.Router();


router.post(
  "/",
  // authorizeRoles("SUPER_ADMIN"),
   protect,
  createRole
);

router.get(
  "/",
protect,
  // authorizeRoles("SUPER_ADMIN"),
  getRoles
);

router.get(
  "/users",
  protect,
  // authorizeRoles("SUPER_ADMIN"),
  getUsersByRole
);
router.put(
  "/:roleId",
  protect,
  authorizeRoles("SUPER_ADMIN"),
  updateRole
);

router.delete(
  "/:roleId",
 protect,
  authorizeRoles("SUPER_ADMIN"),
  deleteRole
);

export default router;
