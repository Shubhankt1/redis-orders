import { SCHEMA_FIELD_TYPE } from "redis";
import { initRedisClient } from "../utils/client.js";
import { indexKey, getKeyName } from "../utils/keys.js";

async function createIndex() {
  const client = await initRedisClient();

  try {
    // try deleting
    await client.ft.dropIndex(indexKey);
  } catch (err) {
    console.log("No existing index found. Creating a new one...");
  }

  await client.ft.create(
    indexKey,
    {
      id: {
        type: SCHEMA_FIELD_TYPE.TEXT,
        AS: "id",
      },
      name: {
        type: SCHEMA_FIELD_TYPE.TEXT,
        AS: "name",
      },
      avgStars: {
        type: SCHEMA_FIELD_TYPE.NUMERIC,
        AS: "avgStars",
        SORTABLE: true,
      },
    },
    {
      ON: "HASH",
      PREFIX: getKeyName("restaurants"),
    }
  );
  console.log("Index Created Successfully!");
}

await createIndex();
process.exit();
