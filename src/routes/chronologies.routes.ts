import { Router } from "express";
import { authenticateToken } from "../middleware/auth-middleware";
import { uploadMiddleware } from "../middleware/file-uploads";
import { ROLES } from "../@types/auth";
import {
  listSources,
  getSourceMeta,
  previewTransformed,
  downloadTransformed,
  deleteSource,
  uploadSource,
} from "../controllers/chronologies.controller";

const router = Router();

router.post(
  "/",
  authenticateToken([ROLES.admin, ROLES.finance]),
  uploadMiddleware,
  uploadSource
);

router.get("/", authenticateToken([ROLES.admin, ROLES.finance]), listSources);

router.get(
  "/:id",
  authenticateToken([ROLES.admin, ROLES.finance]),
  getSourceMeta
);

router.get(
  "/:id/preview",
  authenticateToken([ROLES.admin, ROLES.finance]),
  previewTransformed
);

router.get(
  "/:id/download",
  authenticateToken([ROLES.admin, ROLES.finance]),
  downloadTransformed
);

router.delete(
  "/:id",
  authenticateToken([ROLES.admin, ROLES.finance]),
  deleteSource
);

export default router;
