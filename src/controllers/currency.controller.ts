import { Response } from "express";
import { RequestWrapper } from "../@types/auth";
import { createAuditLog } from "../services/audit.service";
import {
  getCurrencyRatesService,
  updateCurrencyRateService,
} from "../services/currency.service";

export const getCurrencyRatesController = async (
  _: RequestWrapper,
  res: Response
) => {
  try {
    const data = await getCurrencyRatesService();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch currency rates" });
  }
};

export const updateCurrencyRateController = async (
  req: RequestWrapper,
  res: Response
) => {
  const { base, target, rate } = req.body;
  const requesterId = req.user?.id as number;

  if (!base || !target || rate === undefined) {
    res.status(462).json({ error: "Base, target, and rate are required" });
    return;
  }

  try {
    const updatedRate = await updateCurrencyRateService(
      base,
      target,
      parseFloat(rate)
    );

    await createAuditLog(
      requesterId,
      "UPDATE_CURRENCY",
      "CURRENCY",
      `Updated currency rate for ${base} → ${target} to ${rate}`
    );

    res.json(updatedRate);
  } catch (error) {
    res.status(500).json({ error: "Failed to update currency rate" });
  }
};
