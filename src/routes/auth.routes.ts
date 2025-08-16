import { Router } from "express";
import { loginUser, getLoggedInUser } from "../controllers/auth.controller";
import { authenticateToken } from "../middleware/auth-middleware";

const router = Router();

router.post("/login", loginUser);
router.get("/me", authenticateToken(), getLoggedInUser);

export default router;
