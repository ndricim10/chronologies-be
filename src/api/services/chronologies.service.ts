import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import prisma from "../../config/prisma";

const BASE_DIR = path.join(__dirname, "../../uploads/chronologies");

function slug(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 100);
}

async function ensureDir() {
  await fs.mkdir(BASE_DIR, { recursive: true });
}

export async function persistUpload(userId: number, file: Express.Multer.File) {
  await ensureDir();

  const ext = path.extname(file.originalname || "") || ".bin";
  const raw = await fs.readFile(file.path);
  const checksum = crypto.createHash("md5").update(raw).digest("hex");

  const created = await prisma.chronologyFile.create({
    data: {
      userId,
      originalName: file.originalname || "upload.bin",
      storedName: "temp",
      mimeType: file.mimetype || "application/octet-stream",
      size: file.size,
      checksum,
    },
  });

  const finalName = `${created.id}_${slug(
    path.basename(file.originalname || "file", ext)
  )}${ext}`;
  const finalPath = path.join(BASE_DIR, finalName);

  await fs.rename(file.path, finalPath);

  const updated = await prisma.chronologyFile.update({
    where: { id: created.id },
    data: { storedName: finalName },
  });

  return updated;
}

function toIntOrUndef(v: unknown) {
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
}

function sanitizePaging(rawPage?: unknown, rawSize?: unknown) {
  let page = toIntOrUndef(rawPage);
  let size = toIntOrUndef(rawSize);

  // defaults & clamps
  page = page && page > 0 ? page : 1;
  size = size && size > 0 ? Math.min(size, 100) : 10; // cap to 100 to be safe

  const skip = (page - 1) * size;
  return { page, size, skip };
}

export async function listUploads(
  forUserId: number,
  isAdmin: boolean,
  page?: number,
  size?: number
) {
  const { page: safePage, size: safeSize, skip } = sanitizePaging(page, size);
  const where = isAdmin ? {} : { userId: forUserId };

  const [rows, total] = await Promise.all([
    prisma.chronologyFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(Number.isInteger(skip) ? { skip } : {}),
      ...(Number.isInteger(safeSize) ? { take: safeSize } : {}),
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
    prisma.chronologyFile.count({ where }),
  ]);

  return {
    data: rows.map((r) => ({
      id: r.id,
      originalName: r.originalName,
      mimeType: r.mimeType,
      size: r.size,
      checksum: r.checksum ?? undefined,
      createdAt: r.createdAt,
      uploadedBy: {
        id: r.user.id,
        username: r.user.username,
        email: r.user.email,
        name: r.user.name,
        surname: r.user.surname,
        role: r.user.role,
      },
    })),
    currentPage: safePage,
    totalPages: Math.ceil(total / safeSize),
    totalItems: total,
  };
}

export async function getUploadById(id: number) {
  return prisma.chronologyFile.findUnique({ where: { id } });
}

export function getStoredPath(storedName: string) {
  return path.join(BASE_DIR, storedName);
}

export async function removeUpload(fileId: number) {
  const found = await prisma.chronologyFile.findUnique({
    where: { id: fileId },
  });
  if (!found) return false;

  try {
    await fs.unlink(getStoredPath(found.storedName));
  } catch {}

  await prisma.chronologyFile.delete({ where: { id: fileId } });
  return true;
}
