import { Router } from "express";
import fs from "fs";
import * as XLSX from "xlsx";
import { ROLES } from "../@types/auth";
import { authenticateToken } from "../middleware/auth-middleware";
import { uploadMiddleware } from "../middleware/file-uploads";
import { createAuditLog } from "../services/audit.service";
import { transformRows } from "../utils/transformChronologies";

const router = Router();

// POST /api/chronologies/transform?mode=IMPORT|EXPORT
// body: multipart/form-data; field "file"; and optional "vlerePoliuretan" (EXPORT only)
// Roles: ADMIN, FINANCE (but only ADMIN can set vlerePoliuretan)
router.post(
  "/transform",
  authenticateToken([ROLES.admin, ROLES.finance]),
  uploadMiddleware,
  async (req: any, res) => {
    try {
      const mode = (req.query.mode as "IMPORT" | "EXPORT") ?? "IMPORT";
      if (!req.file?.path) {
        res.status(400).json({ error: "Missing file" });
        return;
      }

      const fileBuf = fs.readFileSync(req.file.path);
      fs.unlinkSync(req.file.path);

      const wb = XLSX.read(fileBuf, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
        defval: "",
      });

      const isAdmin = req.user?.role === ROLES.admin;
      const vlerePoliuretan =
        mode === "EXPORT"
          ? isAdmin
            ? String(req.body?.vlerePoliuretan ?? "")
            : ""
          : undefined;

      const transformed = transformRows(rows, mode, vlerePoliuretan);
      const outWs = XLSX.utils.json_to_sheet(transformed);
      const outWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(outWb, outWs, mode);
      const outBuf = XLSX.write(outWb, { type: "buffer", bookType: "xlsx" });

      try {
        await createAuditLog(
          Number(req.user?.id),
          mode === "EXPORT" ? "EXPORT" : "IMPORT",
          "USER",
          `${mode} transform executed`
        );
      } catch {}

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=chronologies_${mode}.xlsx`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.send(outBuf);
    } catch (e) {
      res.status(500).json({ error: "Failed to transform file" });
    }
  }
);

export default router;
