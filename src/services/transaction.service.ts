import { format } from "date-fns";
import ExcelJS from "exceljs";
import { Response } from "express";
import { CommonFilterKeys, Transaction } from "../@types/interfaces";
import prisma from "../config/prisma";
import { addDynamicFilters } from "../utils/common-functions";
import { ROLES, User } from "../@types/auth";

export const getTransactionsService = async (
  page: number = 1,
  pageSize: number = 10,
  filters: CommonFilterKeys,
  user: User,
  sortBy = "createdAt",
  sortOrder = "desc"
) => {
  const skip = (page - 1) * pageSize;
  const dynamicFilters: any = {};

  try {
    addDynamicFilters(filters, dynamicFilters);

    if (user.role === ROLES.finance) {
      dynamicFilters.userId = user.id;
    }

    const orderBy = {
      [sortBy]: sortOrder === "desc" ? "desc" : "asc",
    };

    const transactions: Transaction[] = await prisma.transaction.findMany({
      skip,
      take: pageSize,
      orderBy,
      where: dynamicFilters,
      include: {
        branch: true,
        expenseCategory: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            surname: true,
            role: true,
            fullName: true,
          },
        },
      },
    });

    const totalItems = await prisma.transaction.count({
      where: dynamicFilters,
    });

    const transactionsWithEur = await Promise.all(
      transactions.map(async (transaction) => {
        if (transaction.currency === "EUR") {
          return {
            ...transaction,
            valueInEur: transaction.value,
          };
        }

        const rate = await prisma.currency.findUnique({
          where: {
            base_target: {
              base: transaction.currency,
              target: "EUR",
            },
          },
        });

        const valueInEur = rate ? transaction.value * rate.rate : 0;
        return {
          ...transaction,
          valueInEur,
        };
      })
    );

    return {
      data: transactionsWithEur,
      totalPages: Math.ceil(totalItems / pageSize),
      currentPage: page,
      totalItems,
    };
  } catch (error) {
    throw new Error("Failed to fetch transactions");
  }
};

export const createTransactionService = async (
  branchId: number,
  expenseCategoryId: number,
  userId: number,
  currency: string,
  value: number,
  description?: string,
  createdAt?: Date
) => {
  try {
    const newTransaction = await prisma.transaction.create({
      data: {
        branchId,
        expenseCategoryId,
        userId,
        currency,
        value,
        description,
        createdAt,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return newTransaction;
  } catch (error) {
    throw new Error("Failed to create transaction");
  }
};

export const updateTransactionService = async (
  id: number,
  branchId: number,
  expenseCategoryId: number,
  currency: string,
  value: number,
  description?: string,
  createdAt?: Date
) => {
  try {
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        branchId,
        expenseCategoryId,
        currency,
        value,
        description,
        createdAt,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return updatedTransaction;
  } catch (error) {
    throw new Error("Failed to update transaction");
  }
};

export const deleteTransactionService = async (id: number) => {
  try {
    const transaction = await prisma.transaction.delete({
      where: {
        id: id,
      },
    });

    return transaction;
  } catch (error) {
    throw new Error(`Failed to delete transaction`);
  }
};

export const exportTransactionsByBranchService = async (
  branchId: number,
  res: Response,
  filters: CommonFilterKeys
) => {
  const dynamicFilters: any = {};
  addDynamicFilters(filters, dynamicFilters);

  try {
    const transactions: Transaction[] = await prisma.transaction.findMany({
      where: { ...dynamicFilters, branchId },
      include: { branch: true, expenseCategory: true },
    });

    if (!transactions.length) {
      return res
        .status(404)
        .json({ error: "No transactions found for this branch" });
    }

    const transactionsWithEur = await Promise.all(
      transactions.map(async (transaction) => {
        if (transaction.currency === "EUR") {
          return {
            ...transaction,
            valueInEur: transaction.value,
          };
        }

        const rate = await prisma.currency.findUnique({
          where: {
            base_target: {
              base: transaction.currency,
              target: "EUR",
            },
          },
        });

        const valueInEur = rate
          ? transaction.value * rate.rate
          : transaction.value;
        return { ...transaction, valueInEur };
      })
    );

    const groupedTransactions: Record<
      string,
      {
        period: string;
        valueEur: number;
        valueUsd: number;
        valueAll: number;
        valueInEur: number;
        notes: string[];
      }
    > = {};

    transactionsWithEur.forEach((transaction) => {
      const category = transaction.expenseCategory.label;
      const creationMonth = format(new Date(transaction.createdAt), "MMMM");

      if (!groupedTransactions[category]) {
        groupedTransactions[category] = {
          period: creationMonth,
          valueEur: 0,
          valueUsd: 0,
          valueAll: 0,
          valueInEur: 0,
          notes: [],
        };
      }

      if (transaction.currency === "EUR") {
        groupedTransactions[category].valueEur += transaction.value;
      } else if (transaction.currency === "USD") {
        groupedTransactions[category].valueUsd += transaction.value;
      } else if (transaction.currency === "ALL") {
        groupedTransactions[category].valueAll += transaction.value;
      }

      groupedTransactions[category].valueInEur += transaction.valueInEur;
      if (transaction.description) {
        groupedTransactions[category].notes.push(transaction.description);
      }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Transactions");

    const headerRow = sheet.addRow([
      "Month",
      "Expense Category",
      "Value in EUR",
      "Value in USD",
      "Value in ALL",
      "Converted Value in EUR",
      "Notes",
    ]);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "800000" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    let totalEur = 0;

    Object.entries(groupedTransactions).forEach(([category, data]) => {
      totalEur += data.valueInEur;

      const row = sheet.addRow([
        data.period,
        category,
        data.valueEur || null,
        data.valueUsd || null,
        data.valueAll || null,
        data.valueInEur,
        data.notes.join("; "),
      ]);

      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        if (colNumber === 3 || colNumber === 4 || colNumber === 5) {
          cell.numFmt = "#,##0.00";
        }
        if (colNumber === 6) {
          cell.numFmt = "€#,##0.00";
        }
      });
    });

    sheet.addRow([]);

    const totalRow = sheet.addRow([
      "",
      "Total Expenses",
      "",
      "",
      "",
      totalEur,
      "",
    ]);

    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "0000FF" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      if (colNumber === 6) {
        cell.numFmt = "€#,##0.00";
      }
    });

    sheet.columns = [
      { width: 20 }, // Month
      { width: 60 }, // Expense Category
      { width: 20 }, // Value EUR
      { width: 20 }, // Value USD
      { width: 20 }, // Value ALL
      { width: 20 }, // Converted Value EUR
      { width: 40 }, // Notes
    ];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=transactions.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: "Failed to export transactions" });
  }
};

// service
export const exportTransactionsByExpenseCategoryService = async (
  expenseCategoryId: number,
  res: Response,
  filters: CommonFilterKeys
) => {
  const dynamicFilters: any = {};
  addDynamicFilters(filters, dynamicFilters);

  try {
    const transactions: Transaction[] = await prisma.transaction.findMany({
      where: {
        ...dynamicFilters,
        expenseCategoryId,
      },
      include: { branch: true, expenseCategory: true },
    });

    if (!transactions.length) {
      return res
        .status(404)
        .json({ error: "No transactions found for this expense category" });
    }

    const transactionsWithEur = await Promise.all(
      transactions.map(async (transaction) => {
        if (transaction.currency === "EUR") {
          return {
            ...transaction,
            valueInEur: transaction.value,
          };
        }

        const rate = await prisma.currency.findUnique({
          where: {
            base_target: {
              base: transaction.currency,
              target: "EUR",
            },
          },
        });

        const valueInEur = rate
          ? transaction.value * rate.rate
          : transaction.value;
        return { ...transaction, valueInEur };
      })
    );

    const groupedTransactions: Record<
      string,
      {
        period: string;
        valueEur: number;
        valueUsd: number;
        valueAll: number;
        valueInEur: number;
        notes: string[];
      }
    > = {};

    transactionsWithEur.forEach((transaction) => {
      const branchName = transaction.branch.name;
      const creationMonth = format(new Date(transaction.createdAt), "MMMM");

      if (!groupedTransactions[branchName]) {
        groupedTransactions[branchName] = {
          period: creationMonth,
          valueEur: 0,
          valueUsd: 0,
          valueAll: 0,
          valueInEur: 0,
          notes: [],
        };
      }

      if (transaction.currency === "EUR") {
        groupedTransactions[branchName].valueEur += transaction.value;
      } else if (transaction.currency === "USD") {
        groupedTransactions[branchName].valueUsd += transaction.value;
      } else if (transaction.currency === "ALL") {
        groupedTransactions[branchName].valueAll += transaction.value;
      }

      groupedTransactions[branchName].valueInEur += transaction.valueInEur;
      if (transaction.description) {
        groupedTransactions[branchName].notes.push(transaction.description);
      }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Transactions");

    const headerRow = sheet.addRow([
      "Month",
      "Branch",
      "Value in EUR",
      "Value in USD",
      "Value in ALL",
      "Converted Value in EUR",
      "Notes",
    ]);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "004080" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    let totalEur = 0;

    Object.entries(groupedTransactions).forEach(([branch, data]) => {
      totalEur += data.valueInEur;

      const row = sheet.addRow([
        data.period,
        branch,
        data.valueEur || null,
        data.valueUsd || null,
        data.valueAll || null,
        data.valueInEur,
        data.notes.join("; "),
      ]);

      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };
        if (colNumber === 3 || colNumber === 4 || colNumber === 5) {
          cell.numFmt = "#,##0.00";
        }
        if (colNumber === 6) {
          cell.numFmt = "€#,##0.00";
        }
      });
    });

    sheet.addRow([]);

    const totalRow = sheet.addRow([
      "",
      "Total Expenses",
      "",
      "",
      "",
      totalEur,
      "",
    ]);

    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "0070C0" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      if (colNumber === 6) {
        cell.numFmt = "€#,##0.00";
      }
    });

    sheet.columns = [
      { width: 20 }, // Month
      { width: 40 }, // Branch
      { width: 20 }, // Value EUR
      { width: 20 }, // Value USD
      { width: 20 }, // Value ALL
      { width: 20 }, // Converted Value EUR
      { width: 40 }, // Notes
    ];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=transactions_by_expense_category.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: "Failed to export transactions" });
  }
};
