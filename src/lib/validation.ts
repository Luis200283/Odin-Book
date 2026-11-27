import { z } from "zod";

export const createPostSchema = z
  .object({
    content: z
      .string()
      .trim()
      .max(280, "The post can have at most 280 characters")
      .default(""),
    imageUrl: z.string().url("The image URL is invalid").nullish(),
  })
  .refine((data) => data.content.length > 0 || Boolean(data.imageUrl), {
    message: "Write something or add an image",
    path: ["content"],
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Write a comment")
    .max(280, "The comment can have at most 280 characters"),
});

export type CommentInput = z.infer<typeof commentSchema>;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "The username needs at least 3 characters")
  .max(20, "The username can have at most 20 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Use only letters, numbers and underscores",
  )
  .transform((value) => value.toLowerCase());

export const onboardingSchema = z.object({
  username: usernameSchema,
  bio: z
    .string()
    .trim()
    .max(160, "The bio can have at most 160 characters")
    .optional()
    .or(z.literal("")),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const chatMessageSchema = z
  .string()
  .trim()
  .min(1, "The message cannot be empty")
  .max(500, "The message can have at most 500 characters");
