import { Router } from "express";
import { authenticateToken } from "../middleware/auth-middleware";
import { getLoggedInUser, loginUser } from "../controllers/auth.controller";

const router = Router();

router.post("/login", loginUser);
router.get("/me", authenticateToken(), getLoggedInUser);

export default router;
