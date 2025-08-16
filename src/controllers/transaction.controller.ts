import { Response } from "express";
import { RequestWrapper, User } from "../@types/auth";
import { createAuditLog } from "../services/audit.service";
import {
  createTransactionService,
  deleteTransactionService,
  exportTransactionsByBranchService,
  exportTransactionsByExpenseCategoryService,
  getTransactionsService,
  updateTransactionService,
} from "../services/transaction.service";
import { parseFilters, updatedFilters } from "../utils/common-functions";

export const getTransactionsController = async (
  req: RequestWrapper,
  res: Response
) => {
  try {
    const { user } = req;
    const filters = req.query.filter;
    const parsedFilters = parseFilters(updatedFilters(filters));
    const sortBy = (req.query.sortBy || "createdAt") as string;
    const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.size as string) || 10;

    const transactions = await getTransactionsService(
      page,
      pageSize,
      parsedFilters,
      user as User,
      sortBy,
      sortOrder
    );
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};

export const createTransactionController = async (
  req: RequestWrapper,
  res: Response
) => {
  const {
    branchId,
    expenseCategoryId,
    currency,
    value,
    description,
    createdAt,
  } = req.body;
  const userId = req.user?.id as number;

  if (!branchId || !expenseCategoryId || !currency || value === undefined) {
    res.status(462).json({
      error: "Branch, expense category, currency, and value are required",
    });
    return;
  }

  try {
    const transaction = await createTransactionService(
      branchId,
      expenseCategoryId,
      userId,
      currency,
      value,
      description,
      createdAt
    );

    await createAuditLog(
      userId,
      "CREATE",
      "TRANSACTION",
      `Transaction created for branch ID ${branchId} with value ${value} ${currency}`
    );

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: "Failed to create transaction" });
  }
};

export const updateTransactionController = async (
  req: RequestWrapper,
  res: Response
) => {
  const { id } = req.params;
  const {
    branchId,
    expenseCategoryId,
    currency,
    value,
    description,
    createdAt,
  } = req.body;
  const requesterId = req.user?.id as number;

  if (!branchId || !expenseCategoryId || !currency || value === undefined) {
    res.status(462).json({
      error: "Branch, expense category, currency, and value are required",
    });
    return;
  }

  try {
    const transaction = await updateTransactionService(
      Number(id),
      branchId,
      expenseCategoryId,
      currency,
      value,
      description,
      createdAt
    );
    await createAuditLog(
      requesterId,
      "CREATE",
      "TRANSACTION",
      `Transaction updated for branch ID ${branchId} with value ${value} ${currency}`
    );
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: "Failed to update transaction" });
  }
};

export const deleteTransactionController = async (
  req: RequestWrapper,
  res: Response
) => {
  const { id } = req.params;
  const requesterId = req.user?.id as number;

  try {
    const transaction = await deleteTransactionService(Number(id));
    await createAuditLog(
      requesterId,
      "DELETE",
      "TRANSACTION",
      `Transaction with ID ${id} deleted`
    );
    res.json(transaction);
    return;
  } catch (error) {
    res.status(500).json({ error: "Failed to delete transaction" });
  }
};

export const exportTransactionsByBranchController = async (
  req: RequestWrapper,
  res: Response
) => {
  const { branchId } = req.params;
  const filters = req.query.filter;
  const parsedFilters = parseFilters(updatedFilters(filters));
  if (!branchId) {
    res.status(400).json({ error: "Branch ID is required" });
  }
  await exportTransactionsByBranchService(Number(branchId), res, parsedFilters);
};

export const exportTransactionsByExpenseCategoryController = async (
  req: RequestWrapper,
  res: Response
) => {
  const { expenseCategoryId } = req.params;
  const filters = req.query.filter;
  const parsedFilters = parseFilters(updatedFilters(filters));

  if (!expenseCategoryId) {
    res.status(400).json({ error: "Expense Category ID is required" });
    return;
  }

  await exportTransactionsByExpenseCategoryService(
    Number(expenseCategoryId),
    res,
    parsedFilters
  );
};
