import { Response } from "express";
import {
  createIP,
  deleteIP,
  getAllIPs,
  toggleIPStatus,
  updateIP,
} from "../services/ip-whitelist.service";
import { RequestWrapper } from "../@types/auth";

export const createIPController = async (
  req: RequestWrapper,
  res: Response
) => {
  try {
    const { ip, description } = req.body;
    const newIP = await createIP(ip, description);
    res.status(201).json(newIP);
  } catch (error) {
    res.status(400).json({ message: "Failed to create IP" });
  }
};

export const getIPsController = async (req: RequestWrapper, res: Response) => {
  try {
    const ips = await getAllIPs();
    res.json(ips);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve IPs" });
  }
};

export const updateIPController = async (
  req: RequestWrapper,
  res: Response
) => {
  try {
    const { id } = req.params;
    const updatedIP = await updateIP(Number(id), req.body);
    res.json(updatedIP);
  } catch (error) {
    res.status(400).json({ message: "Failed to update IP" });
  }
};

export const deleteIPController = async (
  req: RequestWrapper,
  res: Response
) => {
  try {
    const { id } = req.params;
    await deleteIP(Number(id));
    res.json({ message: "IP deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: "Failed to delete IP" });
  }
};

export const toggleIPStatusController = async (
  req: RequestWrapper,
  res: Response
) => {
  try {
    const { id } = req.params;
    const updatedIP = await toggleIPStatus(Number(id));
    res.json({
      message: `IP status changed to ${updatedIP.status}`,
      ip: updatedIP,
    });
  } catch (error) {
    res.status(400).json({ error });
  }
};
