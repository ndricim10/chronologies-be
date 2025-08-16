import bcrypt from "bcryptjs";
import { Response } from "express";
import { CreateUser, RequestWrapper, ROLES } from "../@types/auth";
import prisma from "../config/prisma";
import { createAuditLog } from "../services/audit.service";
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "../services/user.service";
import {
  customError,
  parseFilters,
  updatedFilters,
} from "../utils/common-functions";

export const findUserById = (id: string) => {
  const userToFound = prisma.user.findUnique({
    where: { id: Number(id) },
  });
  return userToFound;
};

export const listUsers = async (req: RequestWrapper, res: Response) => {
  const filters = req.query.filter;
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.size as string) || 10;

    const sortBy = (req.query.sortBy || "createdAt") as string;
    const sortOrder = req.query.sortOrder === "desc" ? "desc" : "asc";

    const parsedFilters = parseFilters(updatedFilters(filters));

    if (parsedFilters.status === undefined) {
      parsedFilters.status = "ACTIVE";
    }

    const result = await getUsers(
      page,
      pageSize,
      parsedFilters,
      sortBy,
      sortOrder
    );

    res.json(result);

    return;
  } catch (error) {
    res.status(500).json({ error: " " });
    return;
  }
};

export const getLoggedInUser = async (req: RequestWrapper, res: Response) => {
  try {
    const userId = req.user?.id ?? req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "User not found" });
      return;
    } else {
      const user = await getUserById(userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(user);
      return;
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};

export const createUserController = async (
  req: RequestWrapper,
  res: Response
) => {
  try {
    const { email, branch } = req.body;
    const requesterRole = req.user?.role;
    const requesterId = Number(req.user?.id);

    if (!requesterRole) {
      res.status(401).json({ error: "Unauthorized request." });
      return;
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      res.status(400).json({ error: "Email is already in use." });
      return;
    }

    // Optionally check if branch ID is valid if provided
    if (branch?.id) {
      const branchExists = await prisma.branch.findUnique({
        where: { id: branch.id },
      });

      if (!branchExists) {
        res.status(400).json({ error: "Invalid branch." });
        return;
      }
    }

    const user = await createUser(req.body, requesterRole, requesterId);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const updateUserController = async (
  req: RequestWrapper,
  res: Response
) => {
  try {
    const { id } = req.params;
    const body = req.body as CreateUser;
    const requesterId = Number(req.user?.id);

    const userFound = await findUserById(id);
    if (!userFound) {
      res.status(462).json(customError("User not found"));
      return;
    }
    const updatedUser = await updateUser(Number(id), body, requesterId);
    res.json(updatedUser);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
    return;
  }
};

export const toggleUserStatusController = async (
  req: RequestWrapper,
  res: Response
) => {
  try {
    const { id } = req.params;
    const currentUserId = Number(req.user?.id);

    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { status: user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
    });

    await createAuditLog(
      currentUserId,
      "UPDATE",
      "USER",
      `User "${updatedUser.name} ${updatedUser.surname}" status changed to ${updatedUser.status}`
    );

    res.json({
      message: `User status changed to ${updatedUser.status}`,
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user status" });
  }
};

export const deleteUserController = async (
  req: RequestWrapper,
  res: Response
) => {
  const { id } = req.params;
  const requesterId = Number(req.user?.id);

  try {
    const userToDelete = await findUserById(id);
    if (!userToDelete) {
      res.status(462).json(customError("User not found"));
      return;
    }

    const deletedUser = await deleteUser(Number(id), requesterId);
    res.json(deletedUser);
    return;
  } catch (error: any) {
    res.status(400).json({ error: error.message });
    return;
  }
};

export const getUserController = async (req: RequestWrapper, res: Response) => {
  try {
    const { id } = req.params;
    const user = await getUserById(Number(id));

    if (!user) {
      res.status(404).json(customError("User not found"));
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal server error", details: error });
  }
};

export const updateProfile = async (req: RequestWrapper, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, surname, email } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name, surname, email },
    });

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile" });
  }
};

export const updatePassword = async (req: RequestWrapper, res: Response) => {
  try {
    const userId = req.user?.id;
    const { oldPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) res.status(404).json({ error: "User not found" });

    const passwordMatch = await bcrypt.compare(
      oldPassword,
      user?.password ?? ""
    );
    if (!passwordMatch) res.status(400).json({ error: "Incorrect password" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update password" });
  }
};

export const resetPassword = async (req: RequestWrapper, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const requesterRole = req.user?.role as ROLES;
    const requesterId = req.user?.id as number;

    if (![ROLES.admin].includes(requesterRole)) {
      res.status(403).json({ error: "Unauthorized action" });
    }

    if (!newPassword) {
      res.status(400).json({ error: "New password is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: Number(id) },
      data: { password: hashedPassword },
    });

    await createAuditLog(
      requesterId,
      "RESET_PASSWORD",
      "USER",
      `Reset password for ${user?.name}`
    );

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset password" });
  }
};
