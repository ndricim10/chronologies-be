import { Router } from "express";
import {
  createUserController,
  deleteUserController,
  getLoggedInUser,
  getUserController,
  listUsers,
  resetPassword,
  toggleUserStatusController,
  updatePassword,
  updateProfile,
  updateUserController,
} from "../controllers/user.controller";
import { authenticateToken } from "../../middleware/auth-middleware";
import { adminRoles, allRoles } from "../../utils/common-functions";

const router = Router();

router.get("/", authenticateToken(adminRoles), listUsers);

router.post(
  "/create-user",
  authenticateToken(adminRoles),
  createUserController
);
router.put("/:id", authenticateToken(adminRoles), updateUserController);
router.patch("/profile", authenticateToken(allRoles), updateProfile);
router.patch("/profile/password", authenticateToken(allRoles), updatePassword);
router.post(
  "/:id/reset-password",
  authenticateToken(adminRoles),
  resetPassword
);
router.put(
  "/:id/activate",
  authenticateToken(adminRoles),
  toggleUserStatusController
);

router.delete("/:id", authenticateToken(adminRoles), deleteUserController);

router.get("/get-loggedin-user", authenticateToken(allRoles), getLoggedInUser);
router.get("/:id", authenticateToken(adminRoles), getUserController);

export default router;
