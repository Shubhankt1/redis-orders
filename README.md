# Redis Orders — Restaurant API (Learning project)

A small REST API to manage restaurants, cuisines and reviews built to explore Redis data structures and modules (RedisBloom and RediSearch).

## Features

- Create and list restaurants with cuisines
- Search restaurants by name using RediSearch
- Bloom filter check to avoid duplicate restaurants
- Store restaurant details as Redis JSON
- Add/list/delete reviews and maintain average ratings (sorted set for ranking)
- Cache simple weather lookups per restaurant
- Simple validation using Zod

## Requirements

- Node.js (v18+ recommended)
- Redis server with the following modules enabled:
  - RedisBloom (for `bf.*` commands)
  - RediSearch (for `FT.CREATE` / `ft.*` commands)

If you run Redis locally, ensure modules are loaded. The app uses the default Redis client connection (localhost:6379) unless `REDIS_URL` is provided.

## Setup

1. Install dependencies

```bash
npm install
```

2. Create a `.env` file (optional)

Supported environment variables:

- `PORT` - server port (default: 3000)
- `REDIS_URL` - optional Redis connection URL
- `OPEN_WEATHER_API_KEY` - API key used by the weather endpoint

3. Prepare Redis modules / seeds

If you don't have a Redis server with RediSearch and RedisBloom, you can run Redis Stack (includes both modules) with Docker.

Run with a single container:

```bash
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
```

After the container is running, the app can connect to `redis://localhost:6379` (or set `REDIS_URL` in your `.env`).

Create the RediSearch index and Bloom filter used by the app. These seed scripts are TypeScript files under `seed/`.

Run with `tsx` (installed as a dev dependency):

```bash
npx tsx seed/createBloomFilter.ts
npx tsx seed/createIndex.ts
```

These commands will reserve a Bloom filter and create the RediSearch index for restaurant hashes. Make sure the Redis container is running before you execute them.

## Run

Development (watch mode):

```bash
npm run dev
```

Build + Start:

```bash
npm run build
npm start
```

## API Endpoints

All routes are mounted under `/restaurants` and `/cuisines`.

- `GET /restaurants` — list restaurants (query: `page`, `limit`)
- `POST /restaurants` — create a restaurant
  - body: `{ name, location, cuisines: string[] }`
- `GET /restaurants/search?q=term` — search restaurants by name (RediSearch)
- `GET /restaurants/:restaurantId` — get restaurant details (increments view count)
- `GET /restaurants/:restaurantId/weather?units=metric` — fetch & cache current weather for restaurant location
- `POST /restaurants/:restaurantId/details` — add JSON details (links, contact)
- `GET /restaurants/:restaurantId/details` — get stored JSON details
- `POST /restaurants/:restaurantId/reviews` — add a review
  - body: `{ review, rating }` (rating: 1-5)
- `GET /restaurants/:restaurantId/reviews` — list reviews (query: `page`, `limit`)
- `DELETE /restaurants/:restaurantId/reviews/:reviewId` — delete a review

Cuisine endpoints:

- `GET /cuisines` — list all cuisine names
- `GET /cuisines/:cuisine` — list restaurant names for a cuisine

Responses follow a simple shape:

- Success: `{ success: true, message, data }`
- Error: `{ success: false, error }`

## Notes & Implementation Details

- Uses `redis` official client and lazy-initialized Redis connection in `utils/client.ts`.
- Keys are namespaced with `orders:` via utilities in `utils/keys.ts`.
- A Bloom filter is used to prevent duplicate restaurant creation by name+location.
- Restaurants are stored as Redis HASHES; reviews use lists and per-review hash details.
- Average ratings are tracked in a sorted set (`restaurants_by_rating`) to allow ranking.
- Input validation is handled by Zod schemas in `schemas/`.

## Files to look at

- [index.ts](index.ts) — server entry
- [routes/restaurants.ts](routes/restaurants.ts) — main restaurant routes
- [routes/cuisines.ts](routes/cuisines.ts) — cuisine routes
- [utils/client.ts](utils/client.ts) — Redis connection helper
- [seed/createBloomFilter.ts](seed/createBloomFilter.ts) — reserves Bloom filter
- [seed/createIndex.ts](seed/createIndex.ts) — creates RediSearch index

## Example curl

Create a restaurant:

```bash
curl -X POST http://localhost:3000/restaurants \
	-H 'Content-Type: application/json' \
	-d '{"name":"Tasty Place","location":"London","cuisines":["Italian","Pizza"]}'
```

Search:

```bash
curl 'http://localhost:3000/restaurants/search?q=Tasty'
```

## License

ISC

---

Made for learning Redis and its modules.
