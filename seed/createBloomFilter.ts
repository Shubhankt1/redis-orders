import { initRedisClient } from "../utils/client.js";
import { bloomKey } from "../utils/keys.js";

async function createBloomFilter() {
  const client = await initRedisClient();
  await client.del(bloomKey);
  await client.bf.reserve(bloomKey, 0.0001, 1000000);
  console.log("Bloom filter created successfully!");
  await client.quit();
}

await createBloomFilter();
process.exit();
