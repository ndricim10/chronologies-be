import { Request } from "express";

export const getClientIP = (req: Request) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }

  const remote = req.socket.remoteAddress;
  if (remote === "::1" || remote === "127.0.0.1") {
    return "127.0.0.1";
  }

  return remote || "";
};
