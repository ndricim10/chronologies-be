import bcrypt from "bcryptjs";
import { Response } from "express";
import { RequestWrapper } from "../../@types/auth";
import prisma from "../../config/prisma";
import { generateToken } from "../../utils/jwt";

export const loginUser = async (
  req: RequestWrapper,
  res: Response
): Promise<void> => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [...(username ? [{ username }] : [])],
      },
    });

    if (!user) {
      res.status(400).json({ error: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(400).json({ error: "Invalid credentials" });
      return;
    }

    if (user.status !== "ACTIVE") {
      res.status(462).json({ error: "User account is not active" });
      return;
    }

    const token = generateToken(user.id, user.role);
    res.json({ token, role: user.role });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLoggedInUser = async (req: RequestWrapper, res: Response) => {
  try {
    const userId = req.user?.id ?? req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        surname: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};
