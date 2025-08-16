import { ActionType, ROLES } from "../@types/auth";
import { CommonFilterKeys } from "../@types/interfaces";
import prisma from "../config/prisma";
import { filterKeys } from "../utils/common-functions";

export const getAuditLogs = async (
  page: number = 1,
  pageSize: number = 10,
  filters: CommonFilterKeys = {},
  currentUserRole?: ROLES
) => {
  const skip = (page - 1) * pageSize;
  const dynamicFilters: any = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (filterKeys.includes(key)) {
      if (!isNaN(Number(value))) {
        dynamicFilters[key] = Number(value);
      } else if (key === "role") {
        dynamicFilters.user = {
          role: value,
        };
      } else {
        dynamicFilters[key] = value;
      }
    }
  });

  if (currentUserRole !== ROLES.admin) {
    dynamicFilters.user = {
      ...(dynamicFilters.user || {}),
      role: { not: ROLES.admin },
    };
  }

  const data = await prisma.auditLog.findMany({
    skip,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    where: dynamicFilters,
    include: {
      user: true,
    },
  });

  const totalItems = await prisma.auditLog.count({ where: dynamicFilters });

  return {
    data,
    totalPages: Math.ceil(totalItems / pageSize),
    currentPage: page,
    totalItems,
  };
};

export const createAuditLog = async (
  userId: number,
  action: ActionType,
  resource: string,
  details: string | null
) => {
  const logs: any = {
    data: {
      user: {
        connect: { id: userId },
      },
      action,
      resource,
      details,
    },
  };
  await prisma.auditLog.create(logs);
};
