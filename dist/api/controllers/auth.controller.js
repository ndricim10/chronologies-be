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
exports.getLoggedInUser = exports.loginUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../../config/prisma"));
const jwt_1 = require("../../utils/jwt");
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    try {
        const user = yield prisma_1.default.user.findFirst({
            where: {
                OR: [...(username ? [{ username }] : [])],
            },
        });
        if (!user) {
            res.status(400).json({ error: "Invalid credentials" });
            return;
        }
        const isPasswordValid = yield bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(400).json({ error: "Invalid credentials" });
            return;
        }
        if (user.status !== "ACTIVE") {
            res.status(462).json({ error: "User account is not active" });
            return;
        }
        const token = (0, jwt_1.generateToken)(user.id, user.role);
        res.json({ token, role: user.role });
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.loginUser = loginUser;
const getLoggedInUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : (_c = req.user) === null || _c === void 0 ? void 0 : _c.userId;
        if (!userId) {
            res.status(401).json({ error: "User not found" });
            return;
        }
        const user = yield prisma_1.default.user.findUnique({
            where: { id: Number(userId) },
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                surname: true,
                role: true,
                status: true,
                createdAt: true,
            },
        });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.json(user);
    }
    catch (_d) {
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.getLoggedInUser = getLoggedInUser;
