import ExcelJS from "exceljs";
import { Response } from "express";
import fs from "fs/promises";
import * as XLSX from "xlsx";
import { RequestWrapper, ROLES } from "../../@types/auth";
import { cleanCell } from "../../utils/common-functions";
import {
  normKey,
  parseRequestedCode,
  transformByCode,
} from "../../utils/transformChronologies";
import { createAuditLog } from "../services/audit.service";
import {
  getStoredPath,
  getUploadById,
  listUploads,
  persistUpload,
  removeUpload,
} from "../services/chronologies.service";

import { execFile } from "child_process";
import os from "os";
import path from "path";
import { promisify } from "util";
const execFileP = promisify(execFile);

function sniffFormat(buf: Buffer) {
  const magic = buf.subarray(0, 8);
  const hex = magic.toString("hex");
  const isZip = magic[0] === 0x50 && magic[1] === 0x4b;
  const isOle =
    magic[0] === 0xd0 &&
    magic[1] === 0xcf &&
    magic[2] === 0x11 &&
    magic[3] === 0xe0;
  const head = buf.slice(0, Math.min(buf.length, 4096));
  const s = head.toString("utf8").toLowerCase();
  const looksHTML = s.includes("<html") && s.includes("<table");
  const asciiish = head.every(
    (b) => b === 9 || b === 10 || b === 13 || b === 44 || (b >= 32 && b <= 126)
  );
  return { isZip, isOle, looksHTML, asciiish, hex };
}

async function convertXlsToXlsxWithLibreOffice(
  inputPath: string
): Promise<Buffer> {
  const soffice =
    process.platform === "win32"
      ? "C:\\Program Files\\LibreOffice\\program\\soffice.exe"
      : "soffice";

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "xls2xlsx-"));
  const outBase = path.basename(inputPath).replace(/\.xls$/i, ".xlsx");
  const outPath = path.join(tmpDir, outBase);

  await execFileP(
    soffice,
    ["--headless", "--convert-to", "xlsx", "--outdir", tmpDir, inputPath],
    { timeout: 30000 }
  );
  const buf = await fs.readFile(outPath);
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch {}
  return buf;
}

function readWorkbookResilient(buf: Buffer, originalName?: string) {
  const { isZip, isOle, looksHTML, asciiish } = sniffFormat(buf);

  if (!isZip && !isOle && looksHTML) {
    return XLSX.read(buf.toString("utf8"), { type: "string" });
  }

  try {
    return XLSX.read(buf, { type: "buffer" });
  } catch (e1: any) {
    if (isOle) {
      try {
        return XLSX.read(buf.toString("binary"), { type: "binary" });
      } catch {}
    }

    if (!isZip && !isOle && asciiish) {
      try {
        return XLSX.read(buf.toString("utf8"), { type: "string", raw: true });
      } catch {}
    }

    const msg = String(e1?.message || "");
    if (msg.includes("Truncated")) {
      throw new Error(
        "The .xls file appears incomplete (truncated/corrupted)."
      );
    }
    if (isOle) throw new Error("The .xls file seems corrupted.");
    if (isZip) throw new Error("The .xlsx file seems corrupted.");
    if (asciiish)
      throw new Error("This looks like CSV/Text, not a real Excel file.");
    throw new Error("Unsupported or corrupted Excel file.");
  }
}

export const uploadSource = async (req: RequestWrapper, res: Response) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!req.file?.path) return res.status(400).json({ error: "Missing file" });

    if ((req.file as any)?.truncated) {
      return res.status(400).json({
        error:
          "Upload was truncated (size limit). Please upload a smaller file.",
      });
    }
    if (!req.file.size) {
      return res.status(400).json({ error: "Empty file upload." });
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
  } catch {
    res.status(500).json({ error: "Failed to persist file" });
  }
};

export const listSources = async (req: RequestWrapper, res: Response) => {
  try {
    const userId = Number(req.user?.id);
    const role = req.user?.role as ROLES | undefined;
    const isAdmin = role === ROLES.admin;

    const toPosInt = (v: unknown, def: number, max?: number) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0) return def;
      return max ? Math.min(n, max) : n;
    };
    const page = toPosInt(req.query.page, 1);
    const size = toPosInt(req.query.size, 10, 100);

    const result = await listUploads(userId, isAdmin, page, size);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to list files" });
  }
};

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

function readWorkbook(buf: Buffer) {
  const { isZip, isOle, asciiish } = sniffFormat(buf);
  try {
    return XLSX.read(buf, { type: "buffer" });
  } catch (e1: any) {
    try {
      if (isOle) {
        const bin = buf.toString("binary");
        return XLSX.read(bin, { type: "binary" });
      }
    } catch (e2) {}

    if (!isZip && !isOle && asciiish) {
      try {
        const s = buf.toString("utf8");
        return XLSX.read(s, { type: "string", raw: true });
      } catch (e3) {}
    }

    const msg = String(e1?.message || "");
    if (msg.includes("Truncated")) {
      throw new Error(
        "The Excel file appears incomplete (truncated/corrupted). Please re-export and re-upload."
      );
    }
    if (isZip)
      throw new Error(
        "The .xlsx file seems corrupted. Please re-export it from Excel and upload again."
      );
    if (isOle)
      throw new Error(
        "The .xls file seems corrupted. Please re-export it from Excel and upload again."
      );
    if (asciiish)
      throw new Error(
        "The file looks like CSV/Text. Please upload a valid .xlsx / .xls or provide CSV explicitly."
      );
    throw new Error(
      "Unsupported or corrupted Excel file. Please upload a valid .xlsx or .xls."
    );
  }
}

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

    const filePath = getStoredPath(file.storedName);
    const fileBuf = await fs.readFile(filePath);

    let wbSrc: XLSX.WorkBook | null = null;
    try {
      wbSrc = readWorkbookResilient(fileBuf, file.originalName);
    } catch (e) {
      const { isOle } = sniffFormat(fileBuf);
      if (isOle) {
        try {
          const xlsxBuf = await convertXlsToXlsxWithLibreOffice(filePath);
          wbSrc = XLSX.read(xlsxBuf, { type: "buffer" });
        } catch (convErr) {
          throw new Error(
            "Could not recover the .xls file automatically. Please open it and 'Save As' .xlsx, then re-upload."
          );
        }
      } else {
        throw e;
      }
    }

    if (!wbSrc || !wbSrc.SheetNames.length) {
      throw new Error("No worksheet found in the uploaded file.");
    }

    const wsSrc = wbSrc.Sheets[wbSrc.SheetNames[0]];
    const rows = readSheetObjects(wsSrc);
    if (!rows.length) {
      throw new Error(
        "No data rows detected. Make sure the sheet contains the expected headers and values."
      );
    }

    const isAdmin = role === ROLES.admin;
    const vlerePoliuretan =
      requestedCode === "EX" && isAdmin
        ? String(req.query.vlerePoliuretan ?? "")
        : undefined;

    const transformed = transformByCode(rows, requestedCode, vlerePoliuretan);

    const niceType = requestedCode === "EX" ? "EXPORT" : "IMPORT";
    const dateOnly = new Date().toISOString().slice(0, 10);
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
  } catch (error) {
    console.log(error, "error");
    res
      .status(400)
      .json({ error: (error as Error).message || "Failed to download file" });
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
