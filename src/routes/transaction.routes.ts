import { Router } from "express";
import {
  createTransactionController,
  deleteTransactionController,
  exportTransactionsByBranchController,
  exportTransactionsByExpenseCategoryController,
  getTransactionsController,
  updateTransactionController,
} from "../controllers/transaction.controller";
import { authenticateToken } from "../middleware/auth-middleware";
import { adminRoles, allRoles } from "../utils/common-functions";

const router = Router();

router.get("/", authenticateToken(allRoles), getTransactionsController);
router.post("/", authenticateToken(allRoles), createTransactionController);
router.put("/:id", authenticateToken(allRoles), updateTransactionController);
router.delete("/:id", authenticateToken(allRoles), deleteTransactionController);
router.get(
  "/export/branch/:branchId",
  authenticateToken(adminRoles),
  exportTransactionsByBranchController
);
router.get(
  "/export/expense-category/:expenseCategoryId",
  authenticateToken(adminRoles),
  exportTransactionsByExpenseCategoryController
);

export default router;
