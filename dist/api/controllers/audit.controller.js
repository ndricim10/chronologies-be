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
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuditLogs = void 0;
const audit_service_1 = require("../services/audit.service");
const common_functions_1 = require("../../utils/common-functions");
const listAuditLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.size) || 10;
        const currentUserRole = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.role;
        const filters = req.query.filter;
        const parsedFilters = (0, common_functions_1.parseFilters)((0, common_functions_1.updatedFilters)(filters));
        const result = yield (0, audit_service_1.getAuditLogs)(page, pageSize, parsedFilters, currentUserRole);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch audit logs" });
    }
});
exports.listAuditLogs = listAuditLogs;
