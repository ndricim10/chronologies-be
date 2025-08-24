"use strict";
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
exports.persistUpload = persistUpload;
exports.listUploads = listUploads;
exports.getUploadById = getUploadById;
exports.getStoredPath = getStoredPath;
exports.removeUpload = removeUpload;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../../config/prisma"));
const BASE_DIR = path_1.default.join(__dirname, "../../uploads/chronologies");
function slug(s) {
    return (s || "")
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "")
        .slice(0, 100);
}
function ensureDir() {
    return __awaiter(this, void 0, void 0, function* () {
        yield promises_1.default.mkdir(BASE_DIR, { recursive: true });
    });
}
function persistUpload(userId, file) {
    return __awaiter(this, void 0, void 0, function* () {
        yield ensureDir();
        const ext = path_1.default.extname(file.originalname || "") || ".bin";
        const raw = yield promises_1.default.readFile(file.path);
        const checksum = crypto_1.default.createHash("md5").update(raw).digest("hex");
        const created = yield prisma_1.default.chronologyFile.create({
            data: {
                userId,
                originalName: file.originalname || "upload.bin",
                storedName: "temp",
                mimeType: file.mimetype || "application/octet-stream",
                size: file.size,
                checksum,
            },
        });
        const finalName = `${created.id}_${slug(path_1.default.basename(file.originalname || "file", ext))}${ext}`;
        const finalPath = path_1.default.join(BASE_DIR, finalName);
        yield promises_1.default.rename(file.path, finalPath);
        const updated = yield prisma_1.default.chronologyFile.update({
            where: { id: created.id },
            data: { storedName: finalName },
        });
        return updated;
    });
}
function listUploads(forUserId_1, isAdmin_1) {
    return __awaiter(this, arguments, void 0, function* (forUserId, isAdmin, page = 1, size = 10) {
        const skip = (page - 1) * size;
        const where = isAdmin ? {} : { userId: forUserId };
        const [rows, total] = yield Promise.all([
            prisma_1.default.chronologyFile.findMany({
                where,
                skip,
                take: size,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    originalName: true,
                    mimeType: true,
                    size: true,
                    checksum: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            name: true,
                            surname: true,
                            role: true,
                        },
                    },
                },
            }),
            prisma_1.default.chronologyFile.count({ where }),
        ]);
        return {
            data: rows.map((r) => {
                var _a;
                return ({
                    id: r.id,
                    originalName: r.originalName,
                    mimeType: r.mimeType,
                    size: r.size,
                    checksum: (_a = r.checksum) !== null && _a !== void 0 ? _a : undefined,
                    createdAt: r.createdAt,
                    uploadedBy: {
                        id: r.user.id,
                        username: r.user.username,
                        email: r.user.email,
                        name: r.user.name,
                        surname: r.user.surname,
                        role: r.user.role,
                    },
                });
            }),
            currentPage: page,
            totalPages: Math.ceil(total / size),
            totalItems: total,
        };
    });
}
function getUploadById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return prisma_1.default.chronologyFile.findUnique({ where: { id } });
    });
}
function getStoredPath(storedName) {
    return path_1.default.join(BASE_DIR, storedName);
}
function removeUpload(fileId) {
    return __awaiter(this, void 0, void 0, function* () {
        const found = yield prisma_1.default.chronologyFile.findUnique({
            where: { id: fileId },
        });
        if (!found)
            return false;
        try {
            yield promises_1.default.unlink(getStoredPath(found.storedName));
        }
        catch (_a) { }
        yield prisma_1.default.chronologyFile.delete({ where: { id: fileId } });
        return true;
    });
}
