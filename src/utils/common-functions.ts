import { ROLES } from "../@types/auth";
import { CommonFilterKeys } from "../@types/interfaces";

const { admin, finance } = ROLES;

export const allRoles = Object.values(ROLES);
export const financeRole = [finance];

export const adminRoles = Object.values(ROLES).filter((role) =>
  [admin].includes(role)
);

export const customError = (message = "") => {
  return { message, status: 462 };
};

export const roleHierarchy: Record<ROLES, ROLES[]> = {
  [admin]: adminRoles,
  [finance]: [],
};

export const parseFilters = (filters: string[] = []): CommonFilterKeys => {
  const parsedFilters: CommonFilterKeys = {};

  if (filters) {
    filters.forEach((filter) => {
      const [field, operator, value] = filter.split(":");

      if (!parsedFilters[field]) {
        parsedFilters[field] = {};
      }

      if (operator === "ilike") {
        parsedFilters[field] = { contains: value, mode: "insensitive" };
      } else if (operator === "eq") {
        parsedFilters[field] = value;
      } else if (operator === "gte") {
        parsedFilters[field]["gte"] = new Date(value);
      } else if (operator === "lte") {
        parsedFilters[field]["lte"] = new Date(value);
      } else if (operator === "in") {
        parsedFilters[field]["in"] = value.split(";");
      }
    });
  }

  return parsedFilters;
};

export const updatedFilters = (filters?: any) =>
  (filters && Array.isArray(filters)
    ? filters
    : filters
    ? [filters]
    : []) as string[];

export const filterKeys = [
  "action",
  "resource",
  "userId",
  "createdAt",
  "role",
  "name",
  "label",
  "status",
  "fullName",
];

export const addDynamicFilters = (
  filters: CommonFilterKeys,
  dynamicFilters: any
) => {
  return Object.entries(filters).forEach(([key, value]) => {
    if (filterKeys.includes(key)) {
      if (!isNaN(Number(value))) {
        dynamicFilters[key] = Number(value);
      } else {
        dynamicFilters[key] = value;
      }
    }
  });
};
