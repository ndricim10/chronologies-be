"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientIP = void 0;
const getClientIP = (req) => {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
        return forwarded.split(",")[0].trim();
    }
    const remote = req.socket.remoteAddress;
    if (remote === "::1" || remote === "127.0.0.1") {
        return "127.0.0.1";
    }
    return remote || "";
};
exports.getClientIP = getClientIP;
