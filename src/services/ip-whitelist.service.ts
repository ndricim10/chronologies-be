import { IPWhitelist } from "../@types/interfaces";
import prisma from "../config/prisma";

export const createIP = async (ip: string, description?: string) => {
  return prisma.iPWhitelist.create({
    data: {
      ip,
      description,
    },
  });
};

export const getAllIPs = async () => {
  return (await prisma.iPWhitelist.findMany()).map(
    (item: IPWhitelist, index: number) => ({
      no: index + 1,
      ...item,
    })
  );
};

export const getActiveIPs = async (): Promise<string[]> => {
  const result: {
    ip: string;
  }[] = await prisma.iPWhitelist.findMany({
    where: { status: "ACTIVE" },
    select: { ip: true },
  });

  return result.map((entry) => entry.ip.trim());
};

export const updateIP = async (
  id: number,
  data: Partial<{ ip: string; description: string }>
) => {
  return prisma.iPWhitelist.update({
    where: { id },
    data,
  });
};

export const toggleIPStatus = async (id: number) => {
  const ipEntry = await prisma.iPWhitelist.findUnique({
    where: { id },
  });

  if (!ipEntry) throw new Error("IP not found");

  const newStatus = ipEntry.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  return prisma.iPWhitelist.update({
    where: { id },
    data: { status: newStatus },
  });
};

export const deleteIP = async (id: number) => {
  return prisma.iPWhitelist.delete({
    where: { id },
  });
};
