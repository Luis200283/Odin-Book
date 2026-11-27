import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/db/client";
import { SignOutButton } from "@/components/sign-out-button";

export default async function HomePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      username: true,
      bio: true,
      image: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6 text-white">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Home</h1>
          <p className="text-sm text-neutral-400">@{user?.username}</p>
        </div>
        <SignOutButton />
      </header>

      <section className="rounded-lg border border-neutral-700 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold">Feed coming next</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Phase 2 adds posts, follow, like and comment APIs. Phase 3 builds the
          feed UI with TanStack Query.
        </p>
      </section>

      <section className="rounded-lg border border-neutral-700 bg-neutral-900 p-6">
        <h2 className="text-lg font-semibold">Your profile</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">Name</dt>
            <dd>{user?.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">Username</dt>
            <dd>@{user?.username}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">Bio</dt>
            <dd>{user?.bio ?? "—"}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
