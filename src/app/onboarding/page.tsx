import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/db/client";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const profile = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });

  if (profile?.username) {
    redirect("/home");
  }

  return <OnboardingForm name={session.user.name} />;
}
