import { Router } from "express";
import {
  createBranchController,
  deleteBranchController,
  listBranchesController,
  updateBranchController,
} from "../controllers/branch.controllers";
import { authenticateToken } from "../middleware/auth-middleware";
import { adminRoles, allRoles } from "../utils/common-functions";

const branchRouter = Router();

branchRouter.post("/", authenticateToken(adminRoles), createBranchController);
branchRouter.put("/:id", authenticateToken(adminRoles), updateBranchController);
branchRouter.delete(
  "/:id",
  authenticateToken(adminRoles),
  deleteBranchController
);
branchRouter.get("/", authenticateToken(allRoles), listBranchesController);

export default branchRouter;
