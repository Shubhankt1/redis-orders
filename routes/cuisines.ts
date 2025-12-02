import express from "express";
import { initRedisClient } from "../utils/client.js";
import { cuisineKey, cuisinesKey, restaurantKeyById } from "../utils/keys.js";
import { successResp } from "../utils/responses.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  const client = await initRedisClient();
  const cuisines = await client.sMembers(cuisinesKey);
  return successResp(res, cuisines);
});

router.get("/:cuisine", async (req, res, next) => {
  const { cuisine } = req.params;
  const client = await initRedisClient();
  const restaurantIds = await client.sMembers(cuisineKey(cuisine));

  const restaurants = await Promise.all(
    restaurantIds.map((id) => client.hGet(restaurantKeyById(id), "name"))
  );

  return successResp(res, restaurants);
});

export default router;
