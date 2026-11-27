import { connection, NextResponse } from "next/server";
import { connectRedis } from "@/lib/redis";

export async function GET() {
  await connection();

  try {
    const redis = await connectRedis();
    const visits = await redis.incr("demo:visits");

    await redis.set("demo:greeting", "Hello from Redis", {
      expiration: { type: "EX", value: 60 },
    });

    const greeting = await redis.get("demo:greeting");
    const ttl = await redis.ttl("demo:greeting");

    return NextResponse.json({ visits, greeting, ttl });
  } catch (error) {
    console.error("[redis-test] error:", error);
    return NextResponse.json(
      { error: "Could not reach Redis. Is the container running?" },
      { status: 500 },
    );
  }
}
