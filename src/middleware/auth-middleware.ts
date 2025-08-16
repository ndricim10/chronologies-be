import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { RequestWrapper } from "../@types/auth";

export const authenticateToken = (allowedRoles: string[] = []) => {
  return (req: RequestWrapper, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Access denied. No token provided." });
      return;
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "JWT_SECRET"
      ) as any;

      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        res.status(403).json({ message: "Unauthorized. Insufficient role." });
        return;
      }

      req.user = decoded;

      next();
    } catch (err) {
      res.status(403).json({ message: "Invalid token.: " });
    }
  };
};
