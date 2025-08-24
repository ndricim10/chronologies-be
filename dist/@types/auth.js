"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceTypes = exports.ActionTypes = exports.UserStatus = exports.ROLES = void 0;
var ROLES;
(function (ROLES) {
    ROLES["admin"] = "ADMIN";
    ROLES["finance"] = "FINANCE";
})(ROLES || (exports.ROLES = ROLES = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["active"] = "ACTIVE";
    UserStatus["inActive"] = "INACTIVE";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
exports.ActionTypes = {
    LOGIN: "LOGIN",
    CREATE: "CREATE",
    UPDATE: "UPDATE",
    DELETE: "DELETE",
    EXPORT: "EXPORT",
    IMPORT: "IMPORT",
    UPDATE_CURRENCY: "UPDATE_CURRENCY",
    RESET_PASSWORD: "RESET_PASSWORD",
};
exports.ResourceTypes = {
    USER: "USER",
    LEAD: "LEADS",
    GROUP: "GROUP",
};
