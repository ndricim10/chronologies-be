import { Router } from "express";
import {
  createIPController,
  deleteIPController,
  getIPsController,
  toggleIPStatusController,
  updateIPController,
} from "../controllers/ipWhitelist.controller";
import { authenticateToken } from "../middleware/auth-middleware";
import { adminRoles } from "../utils/common-functions";

const router = Router();

router.post("", authenticateToken(adminRoles), createIPController);
router.get("", authenticateToken(adminRoles), getIPsController);
router.put("/:id", authenticateToken(adminRoles), updateIPController);
router.delete("/:id", authenticateToken(adminRoles), deleteIPController);
router.put(
  "/:id/status",
  authenticateToken(adminRoles),
  toggleIPStatusController
);

export default router;
