import { Request } from "express";

export enum ROLES {
  admin = "ADMIN",
  finance = "FINANCE",
}

export enum UserStatus {
  active = "ACTIVE",
  inActive = "INACTIVE",
}

export const ActionTypes = {
  LOGIN: "LOGIN",
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
  UPDATE_CURRENCY: "UPDATE_CURRENCY",
  RESET_PASSWORD: "RESET_PASSWORD",
} as const;

export type ActionType = keyof typeof ActionTypes;

export const ResourceTypes = {
  USER: "USER",
  LEAD: "LEADS",
  GROUP: "GROUP",
} as const;

export type ResourceType = keyof typeof ResourceTypes;

export interface UserBase {
  username: string;
  name: string;
  surname: string;
  email: string;
  role: ROLES;
}

export interface CreateUser extends UserBase {
  password: string;
}

export type UserUpdateInput = {
  name?: string;
  surname?: string;
  email?: string;
  password?: string;
  role?: string;
};

export interface UserResponse extends UserBase {
  id?: number;
  userId?: number;
  createdAt: Date;
}

export interface UserData {
  user: UserResponse;
}

export interface RequestWrapper extends Request, Partial<UserData> {}

export interface RatesProps {
  id: number;
  base: string;
  target: string;
  rate: number;
  updatedAt: Date;
}

export interface User {
  id: number;
  username: string;
  name: string;
  fullName: string;
  email: string;
  password: string;
  createdAt: Date;
  role: string;
  surname: string;
  status: string;
}
