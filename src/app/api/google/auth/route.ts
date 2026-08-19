import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { buildAuthUrl, isGoogleConfigured } from "@/lib/google";
import { getCurrentUser, getSession } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isGoogleConfigured()) redirect("/my?google=notconfigured");

  const state = randomUUID();
  const session = await getSession();
  session.oauthState = state;
  await session.save();

  redirect(buildAuthUrl(state));
}
