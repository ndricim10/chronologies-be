import { Router } from "express";
import {
  getCurrencyRatesController,
  updateCurrencyRateController,
} from "../controllers/currency.controller";
import { authenticateToken } from "../middleware/auth-middleware";
import { adminRoles, allRoles } from "../utils/common-functions";

const router = Router();

router.get("/", authenticateToken(allRoles), getCurrencyRatesController);
router.put("/", authenticateToken(adminRoles), updateCurrencyRateController);

export default router;
