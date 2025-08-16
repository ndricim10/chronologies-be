import express from "express";
import {
  createExpenseCategory,
  deleteExpenseCategory,
  getExpenseCategoriesController,
  updateExpenseCategory,
} from "../controllers/expenseCategoryController";
import { authenticateToken } from "../middleware/auth-middleware";
import { adminRoles, allRoles } from "../utils/common-functions";

const router = express.Router();

router.post("", authenticateToken(adminRoles), createExpenseCategory);
router.get("", authenticateToken(allRoles), getExpenseCategoriesController);
router.put("/:id", authenticateToken(adminRoles), updateExpenseCategory);
router.delete("/:id", authenticateToken(adminRoles), deleteExpenseCategory);

export default router;
