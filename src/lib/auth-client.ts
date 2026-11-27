import { createAuthClient } from "better-auth/react";

export const { signIn, signUp, signOut, useSession } = createAuthClient();

export async function googleSignIn() {
  await signIn.social({
    provider: "google",
    callbackURL: "/home",
  });
}
