import { Router } from "express";
import { authenticateToken } from "../middleware/auth-middleware";
import { uploadMiddleware } from "../middleware/file-uploads";
import { ROLES } from "../@types/auth";
import {
  uploadSource,
  listSources,
  getSourceMeta,
  previewTransformed,
  downloadTransformed,
  deleteSource,
} from "../controllers/chronologies.controller";

const router = Router();

router.post(
  "/files",
  authenticateToken([ROLES.admin, ROLES.finance]),
  uploadMiddleware,
  uploadSource
);

router.get(
  "/files",
  authenticateToken([ROLES.admin, ROLES.finance]),
  listSources
);

router.get(
  "/files/:id",
  authenticateToken([ROLES.admin, ROLES.finance]),
  getSourceMeta
);

router.get(
  "/files/:id/preview",
  authenticateToken([ROLES.admin, ROLES.finance]),
  previewTransformed
);

router.get(
  "/files/:id/download",
  authenticateToken([ROLES.admin, ROLES.finance]),
  downloadTransformed
);

router.delete(
  "/files/:id",
  authenticateToken([ROLES.admin, ROLES.finance]),
  deleteSource
);

export default router;
