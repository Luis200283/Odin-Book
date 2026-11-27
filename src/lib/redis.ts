import { createClient, type RedisClientType } from "redis";

const globalForRedis = globalThis as unknown as {
  redis?: RedisClientType;
  redisConnect?: Promise<unknown> | null;
};

function createRedisClient(): RedisClientType {
  const client = createClient({
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  });

  client.on("error", (error) => {
    console.error("[redis] client error:", error);
  });

  return client;
}

export const redis: RedisClientType =
  globalForRedis.redis ?? createRedisClient();

globalForRedis.redis = redis;

export async function connectRedis(): Promise<RedisClientType> {
  if (redis.isOpen) {
    return redis;
  }

  if (!globalForRedis.redisConnect) {
    globalForRedis.redisConnect = redis
      .connect()
      .then(() => undefined)
      .catch((error) => {
        globalForRedis.redisConnect = null;
        throw error;
      });
  }

  await globalForRedis.redisConnect;
  return redis;
}
