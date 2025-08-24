"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (allowedRoles = []) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Access denied. No token provided." });
            return;
        }
        const token = authHeader.split(" ")[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "JWT_SECRET");
            if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
                res.status(403).json({ message: "Unauthorized. Insufficient role." });
                return;
            }
            req.user = decoded;
            next();
        }
        catch (err) {
            res.status(403).json({ message: "Invalid token.: " });
        }
    };
};
exports.authenticateToken = authenticateToken;
