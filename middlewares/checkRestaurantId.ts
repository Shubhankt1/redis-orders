import type { Request, Response, NextFunction } from "express";
import { errorResp } from "../utils/responses.js";
import { initRedisClient } from "../utils/client.js";
import { restaurantKeyById } from "../utils/keys.js";

export const checkRestaurantExists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { restaurantId } = req.params;
  if (!restaurantId) {
    return errorResp(res, 400, "Restaurant ID not found!");
  }
  const client = await initRedisClient();
  const restaurantKey = restaurantKeyById(restaurantId);
  const exists = await client.exists(restaurantKey);
  if (!exists) {
    return errorResp(res, 404, "Restaurant not found!");
  }
  next();
};
