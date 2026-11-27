import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  REDIS_URL: z.string().min(1),
  SOCKET_TOKEN_SECRET: z.string().min(32).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "[env] Invalid server environment:",
      z.flattenError(parsed.error).fieldErrors,
    );
    throw new Error("Invalid server environment");
  }

  return parsed.data;
}
