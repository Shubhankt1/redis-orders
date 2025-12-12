import { initRedisClient } from "../utils/client.js";
import { bloomKey } from "../utils/keys.js";

async function createBlookFilter() {
  const client = await initRedisClient();
  await Promise.all([
    client.del(bloomKey),
    client.bf.reserve(bloomKey, 0.0001, 1000000),
  ]);
}

await createBlookFilter();
process.exit();
