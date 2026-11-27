"use client";

import { useState } from "react";
import { z } from "zod";
import { createPostSchema } from "@/lib/validation";

type FieldErrors = {
  content?: string[];
  form?: string[];
};

export default function ZodLabPage() {
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setSuccess(null);

    const localCheck = createPostSchema.safeParse({ content });

    if (!localCheck.success) {
      setErrors(z.flattenError(localCheck.error).fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/lab/zod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localCheck.data),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(data.error ?? { form: ["The server rejected the post"] });
        return;
      }

      setSuccess("The server accepted the post");
      setContent("");
    } catch {
      setErrors({ form: ["Could not reach the server"] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-6 text-white">
      <h1 className="text-2xl font-bold">Zod Lab</h1>
      <p className="text-sm text-neutral-400">
        The same schema runs in the browser and on the server.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="What are you thinking?"
            rows={4}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
          <div className="mt-1 flex justify-between text-xs text-neutral-500">
            <span>{errors.content?.[0]}</span>
            <span>{content.length}/280</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-white px-4 py-2 font-medium text-black hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? "Validating..." : "Create Post"}
        </button>
      </form>

      {errors.form && <p className="text-sm text-red-500">{errors.form[0]}</p>}
      {success && <p className="text-sm text-green-400">{success}</p>}
    </main>
  );
}
