"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_controller_1 = require("../controllers/audit.controller");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const common_functions_1 = require("../../utils/common-functions");
const router = (0, express_1.Router)();
router.get("/", (0, auth_middleware_1.authenticateToken)(common_functions_1.adminRoles), audit_controller_1.listAuditLogs);
exports.default = router;
