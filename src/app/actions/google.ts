"use server";

import { redirect } from "next/navigation";
import { clearGoogleConnection, revokeGoogleToken } from "@/lib/google";
import { requireUser } from "@/lib/session";

export async function disconnectGoogle(): Promise<void> {
  const user = await requireUser();
  if (user.googleRefreshToken) {
    await revokeGoogleToken(user.googleRefreshToken);
  }
  clearGoogleConnection(user.id);
  redirect("/my?google=disconnected");
}
