"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanCell = exports.addDynamicFilters = exports.filterKeys = exports.updatedFilters = exports.parseFilters = exports.roleHierarchy = exports.customError = exports.adminRoles = exports.financeRole = exports.allRoles = void 0;
const auth_1 = require("../@types/auth");
const { admin, finance } = auth_1.ROLES;
exports.allRoles = Object.values(auth_1.ROLES);
exports.financeRole = [finance];
exports.adminRoles = Object.values(auth_1.ROLES).filter((role) => [admin].includes(role));
const customError = (message = "") => {
    return { message, status: 462 };
};
exports.customError = customError;
exports.roleHierarchy = {
    [admin]: exports.adminRoles,
    [finance]: [],
};
const parseFilters = (filters = []) => {
    const parsedFilters = {};
    if (filters) {
        filters.forEach((filter) => {
            const [field, operator, value] = filter.split(":");
            if (!parsedFilters[field]) {
                parsedFilters[field] = {};
            }
            if (operator === "ilike") {
                parsedFilters[field] = { contains: value, mode: "insensitive" };
            }
            else if (operator === "eq") {
                parsedFilters[field] = value;
            }
            else if (operator === "gte") {
                parsedFilters[field]["gte"] = new Date(value);
            }
            else if (operator === "lte") {
                parsedFilters[field]["lte"] = new Date(value);
            }
            else if (operator === "in") {
                parsedFilters[field]["in"] = value.split(";");
            }
        });
    }
    return parsedFilters;
};
exports.parseFilters = parseFilters;
const updatedFilters = (filters) => (filters && Array.isArray(filters)
    ? filters
    : filters
        ? [filters]
        : []);
exports.updatedFilters = updatedFilters;
exports.filterKeys = [
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
const addDynamicFilters = (filters, dynamicFilters) => {
    return Object.entries(filters).forEach(([key, value]) => {
        if (exports.filterKeys.includes(key)) {
            if (!isNaN(Number(value))) {
                dynamicFilters[key] = Number(value);
            }
            else {
                dynamicFilters[key] = value;
            }
        }
    });
};
exports.addDynamicFilters = addDynamicFilters;
const cleanCell = (v) => {
    if (v === null || String(v) === "NULL" || v === undefined)
        return "";
    if (typeof v === "string")
        return v.trim();
    return String(v);
};
exports.cleanCell = cleanCell;
