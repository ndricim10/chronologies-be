import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import auditRouter from "./routes/audit.routes";
import authRoutes from "./routes/auth.routes";
import branchRouter from "./routes/branches.routes";
import userRoutes from "./routes/user.routes";
import currencyRoutes from "./routes/currency.routes";
import expenseCategory from "./routes/expenseCategoryRoutes";
import transactionRoutes from "./routes/transaction.routes";
import { getActiveIPs } from "./services/ip-whitelist.service";
import { getClientIP } from "./utils/ip-whitelist";
import ipWhitelistRoutes from "./routes/ipWhitelist.routes";

dotenv.config();
const app = express();

app.set("trust proxy", true);

const corsOptions: cors.CorsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

const asyncMiddleware =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const checkIPMiddleware = asyncMiddleware(async (req, res, next) => {
  const allowedIPs = await getActiveIPs();

  const userIP = getClientIP(req);

  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && !allowedIPs.includes(userIP)) {
    return res.status(462).json({ message: "Access denied: IP not allowed" });
  }

  next();
});

app.use(checkIPMiddleware);
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/audit", auditRouter);
app.use("/api/branches", branchRouter);
app.use("/api/currency", currencyRoutes);
app.use("/api/expense-categories", expenseCategory);
app.use("/api/transactions", transactionRoutes);
app.use("/api/ips", ipWhitelistRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
