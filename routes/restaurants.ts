import express, { type Request } from "express";
import { validate } from "../middlewares/validate.js";
import { RestaurantSchema, type Restaurant } from "../schemas/restaurant.js";
import { initRedisClient } from "../utils/client.js";
import { nanoid } from "nanoid";
import {
  cuisineKey,
  cuisinesKey,
  restaurantCuisinesKeyById,
  restaurantKeyById,
  restaurantsByRatingKey,
  reviewDetailsKeyById,
  reviewKeyById,
} from "../utils/keys.js";
import { errorResp, successResp } from "../utils/responses.js";
import { checkRestaurantExists } from "../middlewares/checkRestaurantId.js";
import { ReviewSchema, type Review } from "../schemas/review.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const start = (Number(page) - 1) * Number(limit);
  const end = start + Number(limit) - 1;

  const client = await initRedisClient();
  const restaurantIds = await client.zRange(
    restaurantsByRatingKey,
    start,
    end,
    {
      REV: true,
    }
  );
  const restaurants = await Promise.all(
    restaurantIds.map((id) => client.hGetAll(restaurantKeyById(id)))
  );
  return successResp(res, restaurants);
});

router.post("/", validate(RestaurantSchema), async (req, res) => {
  const data = req.body as Restaurant;
  const client = await initRedisClient();
  const id = nanoid();
  const restaurantKey = restaurantKeyById(id);
  const hashData = {
    id,
    name: data.name,
    location: data.location,
  };
  const addResult = await Promise.all([
    ...data.cuisines.map((cuisine) =>
      Promise.all([
        client.sAdd(cuisinesKey, cuisine),
        client.sAdd(cuisineKey(cuisine), id),
        client.sAdd(restaurantCuisinesKeyById(id), cuisine),
      ])
    ),
    client.hSet(restaurantKey, hashData),
    client.zAdd(restaurantsByRatingKey, {
      score: 0,
      value: id,
    }),
  ]);
  return successResp(res, hashData, "Added new Restaurant");
});

router.get(
  "/:restaurantId/weather",
  async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    const { units = "metric" } = req.query;
    console.log(units);
    const client = await initRedisClient();

    const restaurantKey = restaurantKeyById(restaurantId);
    const loc = await client.hGet(restaurantKey, "location");
    if (!loc)
      return errorResp(res, 404, "Location not found for this restaurant!");

    // Get Weather
    console.log("Cache Miss!");
    const weatherApiKey = process.env.OPEN_WEATHER_API_KEY;
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${loc}&appid=${weatherApiKey}&units=${units}`
    );
    if (weatherResponse.status === 200) {
      const weatherData = await weatherResponse.json();
      return successResp(res, weatherData);
    }

    return errorResp(
      res,
      weatherResponse.status,
      "Error fetching weather data!"
    );
  }
);

router.post(
  "/:restaurantId/reviews",
  checkRestaurantExists,
  validate(ReviewSchema),
  async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    const data = req.body as Review;
    const client = await initRedisClient();
    const reviewId = nanoid();
    const reviewKey = reviewKeyById(restaurantId);
    const restaurantKey = restaurantKeyById(restaurantId);
    const reviewDetailsKey = reviewDetailsKeyById(reviewId);
    const reviewData = {
      id: reviewId,
      ...data,
      timestamp: Date.now(),
      restaurantId,
    };
    const [reviewCount, setResult, totalStars] = await Promise.all([
      client.lPush(reviewKey, reviewId),
      client.hSet(reviewDetailsKey, reviewData),
      client.hIncrByFloat(restaurantKey, "totalStars", data.rating),
    ]);
    const averageRating = Number((totalStars / reviewCount).toFixed(1));
    await Promise.all([
      client.zAdd(restaurantsByRatingKey, {
        score: averageRating,
        value: restaurantId,
      }),
      client.hSet(restaurantKey, "avgStars", averageRating),
    ]);
    return successResp(res, reviewData, "Review Added!");
  }
);

router.get(
  "/:restaurantId/reviews",
  checkRestaurantExists,
  async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    const { page = 1, limit = 3 } = req.query;

    const start = (Number(page) - 1) * Number(limit);
    const end = start + Number(limit) - 1;

    const client = await initRedisClient();
    const reviewKey = reviewKeyById(restaurantId);
    const reviewIds = await client.lRange(reviewKey, start, end);

    // Get data for each review ID
    const reviews = await Promise.all(
      reviewIds.map((id) => client.hGetAll(reviewDetailsKeyById(id)))
    );

    return successResp(res, reviews);
  }
);

router.delete(
  "/:restaurantId/reviews/:reviewId",
  checkRestaurantExists,
  async (
    req: Request<{ restaurantId: string; reviewId: string }>,
    res,
    next
  ) => {
    const { restaurantId, reviewId } = req.params;
    const client = await initRedisClient();
    const reviewKey = reviewKeyById(restaurantId);
    const reviewDetailsKey = reviewDetailsKeyById(reviewId);
    const [removeResult, deleteResult] = await Promise.all([
      client.lRem(reviewKey, 0, reviewId),
      client.del(reviewDetailsKey),
    ]);
    if (removeResult === 0 && deleteResult === 0)
      return errorResp(res, 404, "Review Not Found!");

    return successResp(res, reviewId, "Review Deleted!");
  }
);

router.get(
  "/:restaurantId",
  checkRestaurantExists,
  async (req: Request<{ restaurantId: string }>, res, next) => {
    const { restaurantId } = req.params;
    const client = await initRedisClient();
    const restaurantKey = restaurantKeyById(restaurantId);
    const [viewCount, restaurant, cuisines] = await Promise.all([
      client.hIncrBy(restaurantKey, "viewCount", 1),
      client.hGetAll(restaurantKey),
      client.sMembers(restaurantCuisinesKeyById(restaurantId)),
    ]);
    return successResp(res, { ...restaurant, cuisines });
  }
);

export default router;
