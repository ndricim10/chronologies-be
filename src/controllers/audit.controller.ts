import { Response } from "express";
import { RequestWrapper } from "../@types/auth";
import { getAuditLogs } from "../services/audit.service";
import { parseFilters, updatedFilters } from "../utils/common-functions";

export const listAuditLogs = async (req: RequestWrapper, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.size as string) || 10;
    const currentUserRole = req?.user?.role;
    const filters = req.query.filter;
    const parsedFilters = parseFilters(updatedFilters(filters));

    const result = await getAuditLogs(
      page,
      pageSize,
      parsedFilters,
      currentUserRole
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};
