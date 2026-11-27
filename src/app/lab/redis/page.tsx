"use client";

import { useState } from "react";

type RedisTestResult = {
  visits: number;
  greeting: string | null;
  ttl: number;
};

export default function RedisTestPage() {
  const [result, setResult] = useState<RedisTestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTest() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/lab/redis", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? `Request failed with ${response.status}`);
      }

      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-4 p-6 text-white">
      <h1 className="text-2xl font-bold">Redis Lab</h1>
      <p>
        Each click runs INCR on <code>demo:visit</code>, writes{" "}
        <code>demo:greeting</code> with a 60-second TTL, and reads both back.
      </p>

      <button
        onClick={handleTest}
        disabled={loading}
        className="w-full rounded-md bg-white px-4 py-2 font-medium text-black hover:bg-gray-200 disabled:opacity-50"
      >
        {loading ? "Talking to Redis..." : "Run the test"}
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {result && (
        <dl>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">Visits</dt>
            <dd>{result.visits}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">Greeting</dt>
            <dd>{result.greeting}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">TTL</dt>
            <dd>{result.ttl} seconds</dd>
          </div>
        </dl>
      )}
    </main>
  );
}
