import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const generateToken = (id: number, role: string) => {
  const payload = { id, role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "5h" });
};
