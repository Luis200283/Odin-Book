"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { onboardingSchema } from "@/lib/validation";

type FieldErrors = {
  username?: string[];
  bio?: string[];
  form?: string[];
};

export function OnboardingForm({ name }: { name: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const localCheck = onboardingSchema.safeParse({ username, bio });

    if (!localCheck.success) {
      setErrors(z.flattenError(localCheck.error).fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localCheck.data),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(
          data.fields ?? { form: [data.error ?? "Could not save your profile"] },
        );
        return;
      }

      router.push("/home");
      router.refresh();
    } catch {
      setErrors({ form: ["Could not reach the server"] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-6 text-white">
      <header className="space-y-2">
        <p className="text-sm text-neutral-400">Welcome, {name}</p>
        <h1 className="text-3xl font-bold">Pick your username</h1>
        <p className="text-sm text-neutral-400">
          This is how people will find you. You can change it later.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="mb-1 block text-sm text-neutral-300">
            Username
          </label>
          <div className="flex items-center rounded-md border border-neutral-700 bg-neutral-900 px-3">
            <span className="text-neutral-500">@</span>
            <input
              id="username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="yourname"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={20}
              className="w-full bg-transparent px-1 py-2 outline-none"
            />
          </div>
          {errors.username && (
            <p className="mt-1 text-sm text-red-500">{errors.username[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="bio" className="mb-1 block text-sm text-neutral-300">
            Bio <span className="text-neutral-500">(optional)</span>
          </label>
          <textarea
            id="bio"
            name="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Tell people what you are building"
            rows={3}
            maxLength={160}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none"
          />
          <div className="mt-1 flex justify-between text-xs text-neutral-500">
            <span>{errors.bio?.[0]}</span>
            <span>{bio.length}/160</span>
          </div>
        </div>

        {errors.form && <p className="text-sm text-red-500">{errors.form[0]}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-white px-4 py-2 font-medium text-black hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </main>
  );
}
