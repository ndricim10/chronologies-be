import { withSafety } from "../middleware/strip-pagination";
import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma__: PrismaClient | undefined;
}

const base =
  global.__prisma__ ??
  new PrismaClient({
    log: ["query", "error"],
  });

const client = withSafety(base);

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = client as any;
}

const tag = (client as any).__safetyExtensionInstalled;
console.log("[prisma-module]", { moduleId: __filename, tag });

export default client;
export const prisma = client;
