import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/db/client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const profile = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  if (!profile?.username) {
    redirect("/onboarding");
  }

  return <>{children}</>;
}
