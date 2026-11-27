import { NextResponse } from "next/server";
import { z } from "zod";
import { createPostSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { form: ["the body must be valid JSON"] } },
      { status: 400 },
    );
  }

  const result = createPostSchema.safeParse(body);

  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    return NextResponse.json({ error: fieldErrors }, { status: 400 });
  }

  return NextResponse.json({
    message: "The server accepted the post",
    post: result.data,
  });
}
