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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../../@types/auth");
const prisma_1 = __importDefault(require("../../config/prisma"));
const common_functions_1 = require("../../utils/common-functions");
const audit_service_1 = require("./audit.service");
const { admin } = auth_1.ROLES;
const getUsers = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, pageSize = 10, filters = {}, sortBy = "name", sortOrder = "asc") {
    const skip = (page - 1) * pageSize;
    const dynamicFilters = {};
    (0, common_functions_1.addDynamicFilters)(filters, dynamicFilters);
    const orderBy = {
        [sortBy]: sortOrder === "desc" ? "desc" : "asc",
    };
    const data = yield prisma_1.default.user.findMany({
        skip,
        take: pageSize,
        orderBy,
        where: dynamicFilters,
    });
    const totalItems = yield prisma_1.default.user.count({
        where: dynamicFilters,
    });
    return {
        data: data.map((item, index) => (Object.assign(Object.assign({}, item), { no: skip + index + 1, password: undefined, fullName: `${item.name} ${item.surname}` }))),
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: page,
        totalItems,
    };
});
exports.getUsers = getUsers;
const getUserById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield prisma_1.default.user.findUnique({
        where: { id },
    });
    if (response) {
        const updatedData = Object.assign(Object.assign({}, response), { password: undefined });
        return updatedData;
    }
    return {};
});
exports.getUserById = getUserById;
const createUser = (data, role, currentUserId) => __awaiter(void 0, void 0, void 0, function* () {
    if (![admin].includes(role)) {
        throw { status: 403, message: "User with this role is unauthorized" };
    }
    const { password } = data;
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    const createdData = Object.assign(Object.assign({}, data), { password: hashedPassword, fullName: `${data.name} ${data.surname}` });
    const user = yield prisma_1.default.user.create({ data: createdData });
    yield (0, audit_service_1.createAuditLog)(currentUserId, "CREATE", "USER", `Created user "${user.fullName}"`);
    return {
        message: "User has been successfully created!",
        user: { id: user.id },
    };
});
exports.createUser = createUser;
const updateUser = (id, data, currentUserId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { password } = data, updateData = __rest(data, ["password"]);
        const updatedData = Object.assign({}, updateData);
        const user = yield prisma_1.default.user.update({
            where: { id },
            data: updatedData,
        });
        yield (0, audit_service_1.createAuditLog)(currentUserId, "UPDATE", "USER", `Updated user "${user.fullName}"`);
        return {
            message: "User has been successfully updated!",
            user: { id: user.id },
        };
    }
    catch (error) {
        throw new Error("User not found or update failed.");
    }
});
exports.updateUser = updateUser;
const deleteUser = (id, currentUserId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma_1.default.user.delete({
            where: { id },
        });
        yield (0, audit_service_1.createAuditLog)(currentUserId, "DELETE", "USER", `Deleted user "${user.name} ${user.surname}"`);
        return {
            message: "User has been successfully deleted!",
            user: {
                id: user.id,
            },
        };
    }
    catch (error) {
        throw new Error("User not found or delete failed");
    }
});
exports.deleteUser = deleteUser;
