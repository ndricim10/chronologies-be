import { Router } from "express";
import { listAuditLogs } from "../controllers/audit.controller";
import { authenticateToken } from "../middleware/auth-middleware";
import { adminRoles } from "../utils/common-functions";

const router = Router();

router.get("/", authenticateToken(adminRoles), listAuditLogs);

export default router;
