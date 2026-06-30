import { NextFunction, Request, Response } from "express";
import { AppError } from "../../../domain/errors/domain-error";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
  }

  console.error("unhandled error", err);
  return res.status(500).json({
    error: { code: "INTERNAL", message: "internal error" },
  });
}
