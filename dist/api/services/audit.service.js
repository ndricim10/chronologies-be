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
exports.createAuditLog = exports.getAuditLogs = void 0;
const auth_1 = require("../../@types/auth");
const prisma_1 = __importDefault(require("../../config/prisma"));
const common_functions_1 = require("../../utils/common-functions");
const getAuditLogs = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, pageSize = 10, filters = {}, currentUserRole) {
    const skip = (page - 1) * pageSize;
    const dynamicFilters = {};
    Object.entries(filters).forEach(([key, value]) => {
        if (common_functions_1.filterKeys.includes(key)) {
            if (!isNaN(Number(value))) {
                dynamicFilters[key] = Number(value);
            }
            else if (key === "role") {
                dynamicFilters.user = {
                    role: value,
                };
            }
            else {
                dynamicFilters[key] = value;
            }
        }
    });
    if (currentUserRole !== auth_1.ROLES.admin) {
        dynamicFilters.user = Object.assign(Object.assign({}, (dynamicFilters.user || {})), { role: { not: auth_1.ROLES.admin } });
    }
    const data = yield prisma_1.default.auditLog.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        where: dynamicFilters,
        include: {
            user: true,
        },
    });
    const totalItems = yield prisma_1.default.auditLog.count({ where: dynamicFilters });
    return {
        data,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        totalItems,
    };
});
exports.getAuditLogs = getAuditLogs;
const createAuditLog = (userId, action, resource, details) => __awaiter(void 0, void 0, void 0, function* () {
    const logs = {
        data: {
            user: {
                connect: { id: userId },
            },
            action,
            resource,
            details,
        },
    };
    yield prisma_1.default.auditLog.create(logs);
});
exports.createAuditLog = createAuditLog;
