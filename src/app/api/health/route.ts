import { NextResponse } from "next/server";
import { prisma } from "@/db/client";
import { connectRedis } from "@/lib/redis";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    getServerEnv();

    await prisma.$queryRaw`SELECT 1`;

    const redis = await connectRedis();
    const pong = await redis.ping();

    return NextResponse.json({
      ok: true,
      db: "up",
      redis: pong,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[health] error:", error);
    return NextResponse.json(
      { ok: false, error: "Service unhealthy" },
      { status: 503 },
    );
  }
}
