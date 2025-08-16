import { Response } from "express";
import fs from "fs/promises";
import * as XLSX from "xlsx";
import { RequestWrapper, ROLES } from "../@types/auth";
import { createAuditLog } from "../services/audit.service";
import {
  persistUpload,
  listUploads,
  getUploadById,
  getStoredPath,
  removeUpload,
} from "../services/chronologies.service";
import { transformRows } from "../utils/transformChronologies";

export const uploadSource = async (req: RequestWrapper, res: Response) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!req.file?.path) {
      res.status(400).json({ error: "Missing file" });
      return;
    }

    const saved = await persistUpload(userId, req.file);

    await createAuditLog(
      userId,
      "IMPORT",
      "CHRONOLOGIES",
      `Uploaded source file "${saved.originalName}" (id=${saved.id})`
    );

    res.status(201).json({
      message: "File uploaded successfully",
      file: {
        id: saved.id,
        originalName: saved.originalName,
        createdAt: saved.createdAt,
      },
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to persist file" });
  }
};

export const listSources = async (req: RequestWrapper, res: Response) => {
  try {
    const userId = Number(req.user?.id);
    const role = req.user?.role as ROLES | undefined;
    const page = parseInt((req.query.page as string) || "1", 10);
    const size = parseInt((req.query.size as string) || "10", 10);
    const isAdmin = role === ROLES.admin;

    const result = await listUploads(userId, isAdmin, page, size);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to list files" });
  }
};

export const getSourceMeta = async (req: RequestWrapper, res: Response) => {
  try {
    const id = Number(req.params.id);
    const role = req.user?.role as ROLES | undefined;
    const userId = Number(req.user?.id);

    const file = await getUploadById(id);
    if (!file) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (role !== ROLES.admin && file.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(file);
  } catch {
    res.status(500).json({ error: "Failed to fetch file" });
  }
};

// GET /api/chronologies/files/:id/preview?mode=IMPORT|EXPORT&limit=20
export const previewTransformed = async (
  req: RequestWrapper,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    const mode = (req.query.mode as "IMPORT" | "EXPORT") ?? "IMPORT";
    const limit = Math.max(
      1,
      Math.min(parseInt((req.query.limit as string) || "20", 10), 100)
    );
    const role = req.user?.role as ROLES | undefined;
    const userId = Number(req.user?.id);

    const file = await getUploadById(id);
    if (!file) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (role !== ROLES.admin && file.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const fileBuf = await fs.readFile(getStoredPath(file.storedName));
    const wb = XLSX.read(fileBuf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
      defval: "",
    });

    const isAdmin = role === ROLES.admin;
    const vp =
      mode === "EXPORT"
        ? isAdmin
          ? String(req.query.vlerePoliuretan ?? "")
          : ""
        : undefined;

    const transformed = transformRows(rows, mode, vp);
    res.json({ preview: transformed.slice(0, limit) });
  } catch {
    res.status(500).json({ error: "Failed to preview file" });
  }
};

// GET /api/chronologies/files/:id/download?mode=IMPORT|EXPORT&vlerePoliuretan=...
export const downloadTransformed = async (
  req: RequestWrapper,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    const mode = (req.query.mode as "IMPORT" | "EXPORT") ?? "IMPORT";
    const role = req.user?.role as ROLES | undefined;
    const userId = Number(req.user?.id);

    const file = await getUploadById(id);
    if (!file) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (role !== ROLES.admin && file.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const fileBuf = await fs.readFile(getStoredPath(file.storedName));
    const wb = XLSX.read(fileBuf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
      defval: "",
    });

    const isAdmin = role === ROLES.admin;
    const vp =
      mode === "EXPORT"
        ? isAdmin
          ? String(req.query.vlerePoliuretan ?? "")
          : ""
        : undefined;

    const transformed = transformRows(rows, mode, vp);

    const outWs = XLSX.utils.json_to_sheet(transformed);
    const outWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(outWb, outWs, mode);
    const outBuf = XLSX.write(outWb, { type: "buffer", bookType: "xlsx" });

    await createAuditLog(
      userId,
      mode === "EXPORT" ? "EXPORT" : "IMPORT",
      "CHRONOLOGIES",
      `Downloaded transformed (${mode}) for file id=${file.id}`
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=chronologies_${mode}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(outBuf);
  } catch {
    res.status(500).json({ error: "Failed to download file" });
  }
};

// DELETE /api/chronologies/files/:id
export const deleteSource = async (req: RequestWrapper, res: Response) => {
  try {
    const id = Number(req.params.id);
    const role = req.user?.role as ROLES | undefined;
    const userId = Number(req.user?.id);

    const found = await getUploadById(id);
    if (!found) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (role !== ROLES.admin && found.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await removeUpload(id);
    await createAuditLog(
      userId,
      "DELETE",
      "CHRONOLOGIES",
      `Deleted source file id=${id}`
    );
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete file" });
  }
};
