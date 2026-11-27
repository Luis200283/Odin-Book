import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();

  if (session?.user) {
    redirect("/home");
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-8 bg-neutral-950 text-white">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold">Odin-Book</h1>
        <p className="text-neutral-400">
          A small social app built with Next.js, Prisma, Redis and Socket.IO.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/sign-up"
          className="rounded-md bg-white px-6 py-2 font-medium text-black hover:bg-gray-200"
        >
          Sign Up
        </Link>
        <Link
          href="/sign-in"
          className="rounded-md border border-white px-6 py-2 font-medium text-white hover:bg-neutral-800"
        >
          Sign In
        </Link>
      </div>

      <Link href="/lab" className="text-sm text-neutral-500 hover:text-neutral-300">
        Lab
      </Link>
    </main>
  );
}
