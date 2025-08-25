import type { PrismaClient } from "@prisma/client";
import { prisma } from "../config/prisma";

export function withSafety(client: PrismaClient) {
  const flag = "__safetyExtensionInstalled";
  if ((client as any)[flag]) return client;

  // Unique tag to identify the *exact* extended instance
  const tag = `safety-${Math.random().toString(36).slice(2, 10)}`;
  (client as any)[flag] = tag;

  const extended = client.$extends({
    query: {
      $allModels: {
        $allOperations({ args, operation, query }) {
          const isSingle =
            operation === "findUnique" || operation === "findFirst";
          const isCountish = operation === "count" || operation === "aggregate";

          if (isSingle || isCountish) {
            if (args) {
              delete (args as any).skip;
              delete (args as any).take;
            }
          } else if (args) {
            const scrub = (k: "skip" | "take") => {
              const v = (args as any)[k];
              if (v == null) return;
              const n = Number(v);
              if (!Number.isInteger(n) || !Number.isFinite(n)) {
                delete (args as any)[k];
                return;
              }
              if (k === "skip" && n < 0) (args as any)[k] = 0;
              if (k === "take" && n <= 0) delete (args as any)[k];
            };
            scrub("skip");
            scrub("take");
          }

          return query(args);
        },
      },
    },
  });

  (extended as any)[flag] = tag;
  return extended;
}

export const prismaTag =
  (prisma as any)?.__safetyExtensionInstalled ?? "UNEXTENDED";
