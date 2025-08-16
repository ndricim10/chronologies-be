import { Response } from "express";
import { RequestWrapper } from "../@types/auth";
import prisma from "../config/prisma";
import { createAuditLog } from "../services/audit.service";
import { customError, parseFilters } from "../utils/common-functions";

export const listBranchesController = async (
  req: RequestWrapper,
  res: Response
) => {
  const filters = req.query.filter;
  const sortBy = (req.query.sortBy || "createdAt") as string;
  const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

  const orderBy = {
    [sortBy]: sortOrder === "desc" ? "desc" : "asc",
  };

  try {
    const updatedFilters = (
      filters && Array.isArray(filters) ? filters : filters ? [filters] : []
    ) as string[];
    const parsedFilters = parseFilters(updatedFilters);

    const branches = await prisma.branch.findMany({
      where: parsedFilters,
      orderBy,
    });

    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch branches" });
  }
};

export const createBranchController = async (
  req: RequestWrapper,
  res: Response
) => {
  const { name, manager, location, employees } = req.body;
  const currentUserId = req.user?.id;

  try {
    const newBranch = await prisma.branch.create({
      data: {
        name,
        location,
        employees,
        manager,
      },
    });

    await createAuditLog(
      Number(currentUserId),
      "CREATE",
      "BRANCH",
      `Created branch "${newBranch.name}"`
    );

    res.status(201).json({
      message: "Branch created successfully",
      branch: { id: newBranch.id },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create branch" });
  }
};

export const updateBranchController = async (
  req: RequestWrapper,
  res: Response
) => {
  const { id } = req.params;
  const { name, manager, location, employees, status } = req.body;
  const currentUserId = req?.user?.id;

  try {
    const existingBranch = await prisma.branch.findUnique({
      where: { id: Number(id) },
    });

    if (!existingBranch) {
      res.status(404).json(customError("Branch not found"));
      return;
    }

    const updatedBranch = await prisma.branch.update({
      where: { id: Number(id) },
      data: {
        name,
        manager,
        location,
        employees,
      },
    });

    await createAuditLog(
      Number(currentUserId),
      "UPDATE",
      "BRANCH",
      `Updated branch "${updatedBranch.name}" (ID: ${id})`
    );

    res.status(200).json({
      message: "Branch updated successfully",
      branch: { id: updatedBranch.id },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update branch" });
  }
};

export const deleteBranchController = async (
  req: RequestWrapper,
  res: Response
) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;

  try {
    const existingBranch = await prisma.branch.findUnique({
      where: { id: Number(id) },
    });

    if (!existingBranch) {
      res.status(404).json(customError("Branch not found"));
      return;
    }

    await prisma.branch.delete({
      where: { id: Number(id) },
    });

    await createAuditLog(
      Number(currentUserId),
      "DELETE",
      "BRANCH",
      `Deleted branch "${existingBranch.name}" (ID: ${id})`
    );

    res.status(200).json({
      message: "Branch deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete branch" });
  }
};
