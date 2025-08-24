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
exports.resetPassword = exports.updatePassword = exports.updateProfile = exports.getUserController = exports.deleteUserController = exports.toggleUserStatusController = exports.updateUserController = exports.createUserController = exports.getLoggedInUser = exports.listUsers = exports.findUserById = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../../@types/auth");
const prisma_1 = __importDefault(require("../../config/prisma"));
const audit_service_1 = require("../services/audit.service");
const user_service_1 = require("../services/user.service");
const common_functions_1 = require("../../utils/common-functions");
const findUserById = (id) => {
    const userToFound = prisma_1.default.user.findUnique({
        where: { id: Number(id) },
    });
    return userToFound;
};
exports.findUserById = findUserById;
const listUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const filters = req.query.filter;
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.size) || 10;
        const sortBy = (req.query.sortBy || "createdAt");
        const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
        const parsedFilters = (0, common_functions_1.parseFilters)((0, common_functions_1.updatedFilters)(filters));
        if (parsedFilters.status === undefined) {
            parsedFilters.status = "ACTIVE";
        }
        const result = yield (0, user_service_1.getUsers)(page, pageSize, parsedFilters, sortBy, sortOrder);
        res.json(result);
        return;
    }
    catch (error) {
        res.status(500).json({ error: " " });
        return;
    }
});
exports.listUsers = listUsers;
const getLoggedInUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userId = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : (_c = req.user) === null || _c === void 0 ? void 0 : _c.userId;
        if (!userId) {
            res.status(401).json({ error: "User not found" });
            return;
        }
        else {
            const user = yield (0, user_service_1.getUserById)(userId);
            if (!user) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            res.json(user);
            return;
        }
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
        return;
    }
});
exports.getLoggedInUser = getLoggedInUser;
const createUserController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { email, username } = req.body;
        const requesterRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        const requesterId = Number((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
        if (!requesterRole) {
            res.status(401).json({ error: "Unauthorized request." });
            return;
        }
        const existingEmail = yield prisma_1.default.user.findUnique({ where: { email } });
        if (existingEmail) {
            res.status(400).json({ error: "Email is already in use." });
            return;
        }
        const existingUsername = yield prisma_1.default.user.findUnique({
            where: { username },
        });
        if (existingUsername) {
            res.status(400).json({ error: "Username is already in use." });
            return;
        }
        const user = yield (0, user_service_1.createUser)(req.body, requesterRole, requesterId);
        res.status(201).json(user);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.createUserController = createUserController;
const updateUserController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const body = req.body;
        const requesterId = Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const userFound = yield (0, exports.findUserById)(id);
        if (!userFound) {
            res.status(462).json((0, common_functions_1.customError)("User not found"));
            return;
        }
        const updatedUser = yield (0, user_service_1.updateUser)(Number(id), body, requesterId);
        res.json(updatedUser);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
        return;
    }
});
exports.updateUserController = updateUserController;
const toggleUserStatusController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const currentUserId = Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        const user = yield prisma_1.default.user.findUnique({ where: { id: Number(id) } });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const updatedUser = yield prisma_1.default.user.update({
            where: { id: Number(id) },
            data: { status: user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
        });
        yield (0, audit_service_1.createAuditLog)(currentUserId, "UPDATE", "USER", `User "${updatedUser.name} ${updatedUser.surname}" status changed to ${updatedUser.status}`);
        res.json({
            message: `User status changed to ${updatedUser.status}`,
            user: updatedUser,
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update user status" });
    }
});
exports.toggleUserStatusController = toggleUserStatusController;
const deleteUserController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const requesterId = Number((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
    try {
        const userToDelete = yield (0, exports.findUserById)(id);
        if (!userToDelete) {
            res.status(462).json((0, common_functions_1.customError)("User not found"));
            return;
        }
        const deletedUser = yield (0, user_service_1.deleteUser)(Number(id), requesterId);
        res.json(deletedUser);
        return;
    }
    catch (error) {
        res.status(400).json({ error: error.message });
        return;
    }
});
exports.deleteUserController = deleteUserController;
const getUserController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield (0, user_service_1.getUserById)(Number(id));
        if (!user) {
            res.status(404).json((0, common_functions_1.customError)("User not found"));
            return;
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error", details: error });
    }
});
exports.getUserController = getUserController;
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { name, surname, email } = req.body;
        const updatedUser = yield prisma_1.default.user.update({
            where: { id: userId },
            data: { name, surname, email },
        });
        res.json({ message: "Profile updated successfully", user: updatedUser });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update profile" });
    }
});
exports.updateProfile = updateProfile;
const updatePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { oldPassword, newPassword } = req.body;
        const user = yield prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            res.status(404).json({ error: "User not found" });
        const passwordMatch = yield bcryptjs_1.default.compare(oldPassword, (_b = user === null || user === void 0 ? void 0 : user.password) !== null && _b !== void 0 ? _b : "");
        if (!passwordMatch)
            res.status(400).json({ error: "Incorrect password" });
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        yield prisma_1.default.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        res.json({ message: "Password updated successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update password" });
    }
});
exports.updatePassword = updatePassword;
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        const requesterRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        const requesterId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        if (![auth_1.ROLES.admin].includes(requesterRole)) {
            res.status(403).json({ error: "Unauthorized action" });
        }
        if (!newPassword) {
            res.status(400).json({ error: "New password is required" });
        }
        const user = yield prisma_1.default.user.findUnique({ where: { id: Number(id) } });
        if (!user) {
            res.status(404).json({ error: "User not found" });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 10);
        yield prisma_1.default.user.update({
            where: { id: Number(id) },
            data: { password: hashedPassword },
        });
        yield (0, audit_service_1.createAuditLog)(requesterId, "RESET_PASSWORD", "USER", `Reset password for ${user === null || user === void 0 ? void 0 : user.name}`);
        res.json({ message: "Password reset successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to reset password" });
    }
});
exports.resetPassword = resetPassword;
