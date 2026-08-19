import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { exchangeCode, isGoogleConfigured } from "@/lib/google";
import { getCurrentUser, getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isGoogleConfigured()) redirect("/my?google=notconfigured");

  const session = await getSession();
  const expectedState = session.oauthState;
  session.oauthState = undefined;
  await session.save();

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !expectedState || state !== expectedState) {
    redirect("/my?google=error");
  }

  const tokens = await exchangeCode(code);
  if (!tokens) redirect("/my?google=error");

  db.update(users)
    .set({
      googleEmail: tokens.email,
      googleRefreshToken: tokens.refreshToken,
      googleAccessToken: tokens.accessToken,
      googleTokenExpiresAt: tokens.expiresAt,
    })
    .where(eq(users.id, user.id))
    .run();

  redirect("/my?google=connected");
}
