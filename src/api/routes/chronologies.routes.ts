import { Router } from "express";
import { ROLES } from "../../@types/auth";
import {
  deleteSource,
  downloadTransformed,
  getSourceMeta,
  listSources,
  uploadSource,
} from "../controllers/chronologies.controller";
import { authenticateToken } from "../../middleware/auth-middleware";
import { uploadMiddleware } from "../../middleware/file-uploads";

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
  "/:id/download",
  authenticateToken([ROLES.admin, ROLES.finance]),
  downloadTransformed
);

router.delete("/:id", authenticateToken([ROLES.admin]), deleteSource);

export default router;
