import bcrypt from "bcryptjs";
import { Response } from "express";
import { RequestWrapper } from "../@types/auth";
import prisma from "../config/prisma";
import { generateToken } from "../utils/jwt";

export const loginUser = async (
  req: RequestWrapper,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    if (user.status !== "ACTIVE") {
      res.status(462).json({ error: "User account is not active" });
      return;
    } else {
      const token = generateToken(user.id, user.role);

      res.json({
        token,
        role: user.role,
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
