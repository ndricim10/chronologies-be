"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSource = exports.downloadTransformed = exports.getSourceMeta = exports.listSources = exports.uploadSource = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const promises_1 = __importDefault(require("fs/promises"));
const XLSX = __importStar(require("xlsx"));
const auth_1 = require("../../@types/auth");
const audit_service_1 = require("../services/audit.service");
const chronologies_service_1 = require("../services/chronologies.service");
const common_functions_1 = require("../../utils/common-functions");
const transformChronologies_1 = require("../../utils/transformChronologies");
function looksLikeHeaderRow(cells) {
    const anchors = [
        "Lloji DAV",
        "Numri R",
        "Tipi procedures",
        "Kodi 8 shifror",
        "Gds Ds3",
    ];
    const normCells = cells.map((c) => (0, transformChronologies_1.normKey)(String(c !== null && c !== void 0 ? c : "")));
    return anchors.some((a) => normCells.includes((0, transformChronologies_1.normKey)(a)));
}
function readSheetObjects(ws) {
    var _a;
    const aoa = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
    });
    if (!(aoa === null || aoa === void 0 ? void 0 : aoa.length))
        return [];
    let headerIdx = -1;
    const scanLimit = Math.min(aoa.length, 30);
    for (let i = 0; i < scanLimit; i++) {
        if (looksLikeHeaderRow(aoa[i] || [])) {
            headerIdx = i;
            break;
        }
    }
    if (headerIdx === -1)
        headerIdx = 0;
    const headerRow = (aoa[headerIdx] || []).map((h) => String(h !== null && h !== void 0 ? h : "").trim());
    const headers = headerRow.map((h, idx) => (h ? h : `__COL_${idx}`));
    const out = [];
    for (let r = headerIdx + 1; r < aoa.length; r++) {
        const row = aoa[r] || [];
        const obj = {};
        for (let c = 0; c < headers.length; c++)
            obj[headers[c]] = (_a = row[c]) !== null && _a !== void 0 ? _a : "";
        const hasData = Object.values(obj).some((v) => String(v !== null && v !== void 0 ? v : "").trim() !== "");
        if (hasData)
            out.push(obj);
    }
    return out;
}
const uploadSource = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        if (!((_b = req.file) === null || _b === void 0 ? void 0 : _b.path))
            return res.status(400).json({ error: "Missing file" });
        const saved = yield (0, chronologies_service_1.persistUpload)(userId, req.file);
        yield (0, audit_service_1.createAuditLog)(userId, "IMPORT", "CHRONOLOGIES", `Uploaded source file "${saved.originalName}" (id=${saved.id})`);
        res.status(201).json({
            message: "File uploaded successfully",
            file: {
                id: saved.id,
                originalName: saved.originalName,
                createdAt: saved.createdAt,
            },
        });
    }
    catch (_c) {
        res.status(500).json({ error: "Failed to persist file" });
    }
});
exports.uploadSource = uploadSource;
const listSources = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const role = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        const isAdmin = role === auth_1.ROLES.admin;
        const page = parseInt(req.query.page || "1", 10);
        const size = parseInt(req.query.size || "10", 10);
        const result = yield (0, chronologies_service_1.listUploads)(userId, isAdmin, page, size);
        res.json(result);
    }
    catch (_c) {
        res.status(500).json({ error: "Failed to list files" });
    }
});
exports.listSources = listSources;
const getSourceMeta = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const id = Number(req.params.id);
        const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        const userId = Number((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        const file = yield (0, chronologies_service_1.getUploadById)(id);
        if (!file)
            return res.status(404).json({ error: "Not found" });
        if (role !== auth_1.ROLES.admin && file.userId !== userId)
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
    }
    catch (_c) {
        res.status(500).json({ error: "Failed to fetch file" });
    }
});
exports.getSourceMeta = getSourceMeta;
const downloadTransformed = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const id = Number(req.params.id);
        const requestedCode = (0, transformChronologies_1.parseRequestedCode)(String(req.query.type));
        const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        const userId = Number((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        const file = yield (0, chronologies_service_1.getUploadById)(id);
        if (!file)
            return res.status(404).json({ error: "Not found" });
        if (role !== auth_1.ROLES.admin && file.userId !== userId)
            return res.status(403).json({ error: "Forbidden" });
        const fileBuf = yield promises_1.default.readFile((0, chronologies_service_1.getStoredPath)(file.storedName));
        const wbSrc = XLSX.read(fileBuf, { type: "buffer" });
        const wsSrc = wbSrc.Sheets[wbSrc.SheetNames[0]];
        const rows = readSheetObjects(wsSrc);
        const isAdmin = role === auth_1.ROLES.admin;
        const vlerePoliuretan = requestedCode === "EX" && isAdmin
            ? String((_c = req.query.vlerePoliuretan) !== null && _c !== void 0 ? _c : "")
            : undefined;
        const transformed = (0, transformChronologies_1.transformByCode)(rows, requestedCode, vlerePoliuretan);
        const niceType = requestedCode === "EX" ? "EXPORT" : "IMPORT";
        const dateOnly = new Date().toISOString().slice(0, 10);
        const isoDateTime = new Date().toISOString().replace("T", " ").slice(0, 16);
        const filename = `chronologies_${niceType}_${dateOnly}.xlsx`;
        const wb = new exceljs_1.default.Workbook();
        const ws = wb.addWorksheet(niceType, {
            views: [{ state: "frozen", ySplit: 6 }],
        });
        const summaryRows = [
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
            ws.addRow(headers.map((h) => (0, common_functions_1.cleanCell)(r[h])));
        });
        ws.autoFilter = {
            from: { row: headerRowNumber, column: 1 },
            to: { row: headerRowNumber, column: headers.length },
        };
        const WIDTH_MIN = 12;
        const WIDTH_MAX = 40;
        const sampleCount = Math.min(transformed.length, 200);
        headers.forEach((h, idx) => {
            var _a;
            const col = ws.getColumn(idx + 1);
            let maxLen = Math.max(WIDTH_MIN, String(h).length);
            for (let i = 0; i < sampleCount; i++) {
                const v = (_a = transformed[i]) === null || _a === void 0 ? void 0 : _a[h];
                const len = String(v !== null && v !== void 0 ? v : "").length;
                if (len > maxLen)
                    maxLen = len;
            }
            col.width = Math.min(Math.max(maxLen + 2, WIDTH_MIN), WIDTH_MAX);
        });
        const centerCols = new Set([
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
        const outBuf = yield wb.xlsx.writeBuffer();
        yield (0, audit_service_1.createAuditLog)(userId, requestedCode === "EX" ? "EXPORT" : "IMPORT", "CHRONOLOGIES", `Downloaded transformed (${requestedCode}) for file id=${file.id}`);
        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(Buffer.from(outBuf));
    }
    catch (_d) {
        res.status(500).json({ error: "Failed to download file" });
    }
});
exports.downloadTransformed = downloadTransformed;
const deleteSource = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const id = Number(req.params.id);
        const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        const userId = Number((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        const found = yield (0, chronologies_service_1.getUploadById)(id);
        if (!found)
            return res.status(404).json({ error: "Not found" });
        if (role !== auth_1.ROLES.admin && found.userId !== userId)
            return res.status(403).json({ error: "Forbidden" });
        yield (0, chronologies_service_1.removeUpload)(id);
        yield (0, audit_service_1.createAuditLog)(userId, "DELETE", "CHRONOLOGIES", `Deleted source file id=${id}`);
        res.json({ message: "Deleted" });
    }
    catch (_c) {
        res.status(500).json({ error: "Failed to delete file" });
    }
});
exports.deleteSource = deleteSource;
