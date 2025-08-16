import prisma from "../config/prisma";

export interface Branch {
  id: number;
  name: string;
  location: string;
  employees: number;
  manager: string;
}

export interface AuditLog {
  id: number;
  userId: number;
  action: string;
  resource: string;
  details?: string;
  createdAt: Date;
}

export interface ExpenseCategory {
  id: number;
  label: string;
  createdAt: Date;
}

export interface Transaction {
  id: number;
  branchId: number;
  expenseCategoryId: number;
  userId: number;
  currency: string;
  value: number;
  description: string | null;
  createdAt: Date;
  valueInEur?: number | null;

  branch: Branch;
  expenseCategory: ExpenseCategory;
  user?: {
    id: number;
    name: string;
    email: string;
    surname: string;
    role: string;
    fullName: string;
  };
}

export interface Categories {
  id: number;
  createdAt: Date;
  label: string;
}

export interface CommonFilterKeys {
  [key: string]: any;
}

export type IPWhitelist = Awaited<
  ReturnType<typeof prisma.iPWhitelist.findFirst>
>;
