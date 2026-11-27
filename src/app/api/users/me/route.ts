import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/db/client";
import { onboardingSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The body must be valid JSON" },
      { status: 400 },
    );
  }

  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid input",
        fields: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  const { username, bio } = parsed.data;

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username,
        bio: bio || null,
      },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        image: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: "Username already taken",
          fields: { username: ["Username already taken"] },
        },
        { status: 409 },
      );
    }

    console.error("[users/me] error:", error);
    return NextResponse.json(
      { error: "Could not update your profile" },
      { status: 500 },
    );
  }
}
