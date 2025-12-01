import type { Request, Response, NextFunction } from "express";
import { errorResp } from "../utils/responses.js";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);
  errorResp(res, 500, err);
}
