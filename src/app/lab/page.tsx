import Link from "next/link";

const labs = [
  {
    href: "/lab/redis",
    title: "Redis",
    description: "INCR, SET with TTL, GET and TTL against the real Redis.",
  },
  {
    href: "/lab/zod",
    title: "Zod",
    description: "The same post schema running in the browser and the server.",
  },
  {
    href: "/lab/socket",
    title: "Socket.IO",
    description: "Connect, disconnect, ping and broadcast a chat message.",
  },
];

export default function LabPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Lab</h1>
        <p className="text-sm text-neutral-400">
          Small experiments that are not part of the social MVP.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-3">
        {labs.map((lab) => (
          <li key={lab.href}>
            <Link
              href={lab.href}
              className="block h-full rounded-lg border border-neutral-700 bg-neutral-900 p-4 transition-colors hover:border-neutral-500"
            >
              <h2 className="font-semibold">{lab.title}</h2>
              <p className="mt-1 text-sm text-neutral-400">{lab.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
