"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const router = (0, express_1.Router)();
router.post("/login", auth_controller_1.loginUser);
router.get("/me", (0, auth_middleware_1.authenticateToken)(), auth_controller_1.getLoggedInUser);
exports.default = router;
