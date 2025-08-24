import ExcelJS from "exceljs";
import { Response } from "express";
import fs from "fs/promises";
import * as XLSX from "xlsx";
import { RequestWrapper, ROLES } from "../../@types/auth";
import { createAuditLog } from "../services/audit.service";
import {
  getStoredPath,
  getUploadById,
  listUploads,
  persistUpload,
  removeUpload,
} from "../services/chronologies.service";
import { cleanCell } from "../../utils/common-functions";
import {
  normKey,
  parseRequestedCode,
  transformByCode,
} from "../../utils/transformChronologies";

function looksLikeHeaderRow(cells: any[]): boolean {
  const anchors = [
    "Lloji DAV",
    "Numri R",
    "Tipi procedures",
    "Kodi 8 shifror",
    "Gds Ds3",
  ];
  const normCells = cells.map((c) => normKey(String(c ?? "")));
  return anchors.some((a) => normCells.includes(normKey(a)));
}

function readSheetObjects(ws: XLSX.WorkSheet): Record<string, any>[] {
  const aoa = XLSX.utils.sheet_to_json<any[]>(ws, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  if (!aoa?.length) return [];

  let headerIdx = -1;
  const scanLimit = Math.min(aoa.length, 30);
  for (let i = 0; i < scanLimit; i++) {
    if (looksLikeHeaderRow(aoa[i] || [])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) headerIdx = 0;

  const headerRow = (aoa[headerIdx] || []).map((h: any) =>
    String(h ?? "").trim()
  );
  const headers = headerRow.map((h, idx) => (h ? h : `__COL_${idx}`));

  const out: Record<string, any>[] = [];
  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const row = aoa[r] || [];
    const obj: Record<string, any> = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = row[c] ?? "";
    const hasData = Object.values(obj).some(
      (v) => String(v ?? "").trim() !== ""
    );
    if (hasData) out.push(obj);
  }

  return out;
}

export const uploadSource = async (req: RequestWrapper, res: Response) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!req.file?.path) return res.status(400).json({ error: "Missing file" });

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
  } catch {
    res.status(500).json({ error: "Failed to persist file" });
  }
};

export const listSources = async (req: RequestWrapper, res: Response) => {
  try {
    const userId = Number(req.user?.id);
    const role = req.user?.role as ROLES | undefined;
    const isAdmin = role === ROLES.admin;
    const page = parseInt((req.query.page as string) || "1", 10);
    const size = parseInt((req.query.size as string) || "10", 10);

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
    if (!file) return res.status(404).json({ error: "Not found" });
    if (role !== ROLES.admin && file.userId !== userId)
      return res.status(403).json({ error: "Forbidden" });

    res.json({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      checksum: file.checksum,
      createdAt: file.createdAt,
      userId: file.userId,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch file" });
  }
};

export const downloadTransformed = async (
  req: RequestWrapper,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    const requestedCode = parseRequestedCode(String(req.query.type));
    const role = req.user?.role as ROLES | undefined;
    const userId = Number(req.user?.id);

    const file = await getUploadById(id);
    if (!file) return res.status(404).json({ error: "Not found" });
    if (role !== ROLES.admin && file.userId !== userId)
      return res.status(403).json({ error: "Forbidden" });

    const fileBuf = await fs.readFile(getStoredPath(file.storedName));
    const wbSrc = XLSX.read(fileBuf, { type: "buffer" });
    const wsSrc = wbSrc.Sheets[wbSrc.SheetNames[0]];
    const rows = readSheetObjects(wsSrc);

    const isAdmin = role === ROLES.admin;
    const vlerePoliuretan =
      requestedCode === "EX" && isAdmin
        ? String(req.query.vlerePoliuretan ?? "")
        : undefined;

    const transformed = transformByCode(rows, requestedCode, vlerePoliuretan);

    const niceType = requestedCode === "EX" ? "EXPORT" : "IMPORT";
    const dateOnly = new Date().toISOString().slice(0, 10);
    const isoDateTime = new Date().toISOString().replace("T", " ").slice(0, 16);
    const filename = `chronologies_${niceType}_${dateOnly}.xlsx`;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(niceType, {
      views: [{ state: "frozen", ySplit: 6 }],
    });

    const summaryRows: Array<[string, string]> = [
      ["Raporti", "Chronologies"],
      ["Lloji DAV", niceType],
      ["Rreshta të përfshira", String(transformed.length)],
    ];
    summaryRows.forEach(([k, v]) => ws.addRow([k, v]));
    ws.addRow([]);

    const HEADERS_IMPORT = [
      "Kodi R",
      "Tipi procedures",
      "kodi 4 shifror",
      "pershkrim",
      "Palet",
      "Cmimi artikullit monedhe",
      "Shuma paguar",
      "Pesha neto kg",
      "Vlera statistikore",
      "Vlera e Fatures",
      "transp i brendshem (EUR)",
    ];
    const HEADERS_EXPORT = [
      ...HEADERS_IMPORT,
      "Emri eksportuesit",
      "Vlere poliuretan",
      "Vlera e mallit",
    ];
    const headers = requestedCode === "EX" ? HEADERS_EXPORT : HEADERS_IMPORT;

    const headerRowNumber = ws.rowCount + 1;

    ws.addRow(headers);

    transformed.forEach((r) => {
      ws.addRow(headers.map((h) => cleanCell(r[h])));
    });

    ws.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: headers.length },
    };

    const WIDTH_MIN = 12;
    const WIDTH_MAX = 40;

    const sampleCount = Math.min(transformed.length, 200);
    headers.forEach((h, idx) => {
      const col = ws.getColumn(idx + 1);

      let maxLen = Math.max(WIDTH_MIN, String(h).length);
      for (let i = 0; i < sampleCount; i++) {
        const v = transformed[i]?.[h];
        const len = String(v ?? "").length;
        if (len > maxLen) maxLen = len;
      }
      col.width = Math.min(Math.max(maxLen + 2, WIDTH_MIN), WIDTH_MAX);
    });

    const centerCols = new Set<string>([
      "Kodi R",
      "Tipi procedures",
      "kodi 4 shifror",
      "Palet",
      "Cmimi artikullit monedhe",
      "Shuma paguar",
      "Pesha neto kg",
      "Vlera statistikore",
      "Vlera e Fatures",
      "transp i brendshem (EUR)",
    ]);

    headers.forEach((h, idx) => {
      if (centerCols.has(h)) {
        ws.getColumn(idx + 1).alignment = { horizontal: "center" };
      }
    });

    const headerRow = ws.getRow(headerRowNumber);
    headerRow.font = { bold: true };

    const outBuf = await wb.xlsx.writeBuffer();

    await createAuditLog(
      userId,
      requestedCode === "EX" ? "EXPORT" : "IMPORT",
      "CHRONOLOGIES",
      `Downloaded transformed (${requestedCode}) for file id=${file.id}`
    );

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(Buffer.from(outBuf));
  } catch {
    res.status(500).json({ error: "Failed to download file" });
  }
};

export const deleteSource = async (req: RequestWrapper, res: Response) => {
  try {
    const id = Number(req.params.id);
    const role = req.user?.role as ROLES | undefined;
    const userId = Number(req.user?.id);

    const found = await getUploadById(id);
    if (!found) return res.status(404).json({ error: "Not found" });
    if (role !== ROLES.admin && found.userId !== userId)
      return res.status(403).json({ error: "Forbidden" });

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
