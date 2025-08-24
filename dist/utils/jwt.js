"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const generateToken = (id, role) => {
    const payload = { id, role };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: "5h" });
};
exports.generateToken = generateToken;
