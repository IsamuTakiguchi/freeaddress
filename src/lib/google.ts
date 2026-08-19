import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function googleRedirectUri(): string {
  return `${appUrl()}/api/google/callback`;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  error?: string;
}

// 認可コードをトークンに交換し、連携アカウントのメールアドレスを取り出す
export async function exchangeCode(code: string): Promise<{
  refreshToken: string;
  accessToken: string;
  expiresAt: number;
  email: string | null;
} | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as TokenResponse;
  if (!data.refresh_token || !data.access_token) return null;

  let email: string | null = null;
  if (data.id_token) {
    try {
      const payload = JSON.parse(
        Buffer.from(data.id_token.split(".")[1], "base64url").toString(),
      );
      email = typeof payload.email === "string" ? payload.email : null;
    } catch {
      email = null;
    }
  }

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    email,
  };
}

// ユーザーの有効なアクセストークンを返す（期限切れならリフレッシュ、
// 連携解除済み・取り消し済みなら null を返して連携情報をクリアする）
export async function getAccessTokenForUser(user: User): Promise<string | null> {
  if (!user.googleRefreshToken) return null;
  if (
    user.googleAccessToken &&
    user.googleTokenExpiresAt &&
    user.googleTokenExpiresAt > Date.now() + 60_000
  ) {
    return user.googleAccessToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: user.googleRefreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token) {
    // ユーザーがGoogle側で連携を取り消した場合など
    if (data.error === "invalid_grant") clearGoogleConnection(user.id);
    return null;
  }

  const expiresAt = Date.now() + data.expires_in * 1000;
  db.update(users)
    .set({ googleAccessToken: data.access_token, googleTokenExpiresAt: expiresAt })
    .where(eq(users.id, user.id))
    .run();
  return data.access_token;
}

export function clearGoogleConnection(userId: number): void {
  db.update(users)
    .set({
      googleEmail: null,
      googleRefreshToken: null,
      googleAccessToken: null,
      googleTokenExpiresAt: null,
    })
    .where(eq(users.id, userId))
    .run();
}

export async function revokeGoogleToken(refreshToken: string): Promise<void> {
  await fetch(`${REVOKE_URL}?token=${encodeURIComponent(refreshToken)}`, {
    method: "POST",
  }).catch(() => {});
}

export interface EventInput {
  resourceName: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  purpose?: string | null;
}

// Google Calendar API に渡すイベント本体（純粋関数・テスト対象）
export function buildEventPayload(input: EventInput) {
  return {
    summary: `【予約】${input.resourceName}`,
    description: input.purpose
      ? `${input.purpose}\n\n（フリーアドレス予約アプリから自動登録）`
      : "（フリーアドレス予約アプリから自動登録）",
    location: input.resourceName,
    start: {
      dateTime: `${input.date}T${input.startTime}:00`,
      timeZone: "Asia/Tokyo",
    },
    end: {
      dateTime: `${input.date}T${input.endTime}:00`,
      timeZone: "Asia/Tokyo",
    },
  };
}

// カレンダーへイベント作成。失敗時は null（予約自体は成立させる）
export async function insertCalendarEvent(
  accessToken: string,
  input: EventInput,
): Promise<string | null> {
  try {
    const res = await fetch(EVENTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildEventPayload(input)),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch {
    return null;
  }
}

// カレンダーからイベント削除（既に削除済み=404/410 は成功扱い）
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
): Promise<void> {
  await fetch(`${EVENTS_URL}/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}
