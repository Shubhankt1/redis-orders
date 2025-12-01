import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;

export async function initRedisClient() {
  if (!client) {
    client = createClient();
    client
      .on("error", (err) => {
        console.error(err);
      })
      .on("connect", () => {
        console.log("Redis Connected!");
      });
    await client.connect();
  }
  return client;
}
