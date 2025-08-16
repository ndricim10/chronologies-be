import { Response } from "express";
import { RequestWrapper } from "../@types/auth";
import prisma from "../config/prisma";
import { createAuditLog } from "../services/audit.service";
import { getExpenseCategories } from "../services/expenseCategories.service";
import { parseFilters, updatedFilters } from "../utils/common-functions";

export const getExpenseCategoriesController = async (
  req: RequestWrapper,
  res: Response
) => {
  try {
    const filters = req.query.filter;
    const parsedFilters = parseFilters(updatedFilters(filters));

    const sortBy = (req.query.sortBy || "createdAt") as string;
    const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.size as string) || 10;

    const result = await getExpenseCategories(
      page,
      pageSize,
      parsedFilters,
      sortBy,
      sortOrder
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching expense categories",
    });
  }
};
export const createExpenseCategory = async (
  req: RequestWrapper,
  res: Response
) => {
  try {
    const { label } = req.body;

    const data = await prisma.expenseCategory.create({
      data: {
        label,
      },
    });

    await createAuditLog(
      Number(req?.user?.id),
      "CREATE",
      "EXPENSE_CATEGORY",
      `Created expense category with label: ${label}`
    );

    res.status(201).json({
      message: "Expense category created successfully",
      data,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating expense category",
    });
  }
};

export const updateExpenseCategory = async (
  req: RequestWrapper,
  res: Response
) => {
  const { id } = req.params;
  const { label } = req.body;

  try {
    const updatedCategory = await prisma.expenseCategory.update({
      where: { id: parseInt(id) },
      data: { label },
    });

    await createAuditLog(
      Number(req?.user?.id),
      "UPDATE",
      "EXPENSE_CATEGORY",
      `Updated expense category with id: ${id} to label: ${label}`
    );

    res.status(200).json({
      message: "Expense category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating expense category",
    });
  }
};

export const deleteExpenseCategory = async (
  req: RequestWrapper,
  res: Response
) => {
  const { id } = req.params;

  try {
    await prisma.expenseCategory.delete({
      where: { id: parseInt(id) },
    });

    await createAuditLog(
      Number(req?.user?.id),
      "DELETE",
      "EXPENSE_CATEGORY",
      `Deleted expense category with id: ${id}`
    );

    res.status(200).json({ message: "Expense category deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting expense category",
    });
  }
};
