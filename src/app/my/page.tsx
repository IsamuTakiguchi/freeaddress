import { asc, desc, eq } from "drizzle-orm";
import { disconnectGoogle } from "@/app/actions/google";
import { cancelReservation } from "@/app/actions/reservations";
import { db } from "@/db";
import { reservations, resources } from "@/db/schema";
import { todayJst } from "@/lib/config";
import { isGoogleConfigured } from "@/lib/google";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const GOOGLE_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  connected: { text: "Googleカレンダーと連携しました。今後の予約は自動でカレンダーに登録されます。", ok: true },
  disconnected: { text: "Googleカレンダーとの連携を解除しました。", ok: true },
  error: { text: "Googleカレンダーとの連携に失敗しました。もう一度お試しください。", ok: false },
  notconfigured: { text: "Googleカレンダー連携は未設定です。管理者にお問い合わせください。", ok: false },
};

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const user = await requireUser();
  const today = todayJst();
  const { google } = await searchParams;
  const googleMessage = google ? GOOGLE_MESSAGES[google] : undefined;

  const rows = db
    .select({
      id: reservations.id,
      date: reservations.date,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      purpose: reservations.purpose,
      resourceName: resources.name,
    })
    .from(reservations)
    .innerJoin(resources, eq(reservations.resourceId, resources.id))
    .where(eq(reservations.userId, user.id))
    .orderBy(desc(reservations.date), asc(reservations.startTime))
    .all();

  const upcoming = rows
    .filter((r) => r.date >= today)
    .sort((a, b) =>
      a.date === b.date
        ? a.startTime.localeCompare(b.startTime)
        : a.date.localeCompare(b.date),
    );
  const past = rows.filter((r) => r.date < today);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">マイ予約</h1>

      {googleMessage && (
        <p
          className={`rounded border px-4 py-3 text-sm ${
            googleMessage.ok
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {googleMessage.text}
        </p>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-medium text-gray-700">Googleカレンダー連携</h2>
        {!isGoogleConfigured() ? (
          <p className="text-sm text-gray-500">
            この機能は現在利用できません（管理者がGoogle APIの設定を行うと有効になります）。
          </p>
        ) : user.googleRefreshToken ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-gray-700">
              連携中：
              <span className="font-medium">
                {user.googleEmail ?? "Googleアカウント"}
              </span>
              <span className="ml-2 text-xs text-gray-500">
                予約すると自動でカレンダーに登録され、取消時に削除されます。
              </span>
            </p>
            <form action={disconnectGoogle} className="ml-auto">
              <button
                type="submit"
                className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                連携を解除
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-gray-600">
              Googleアカウントを連携すると、予約が自動でカレンダーに登録されます。
            </p>
            <a
              href="/api/google/auth"
              className="ml-auto rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Googleカレンダーと連携する
            </a>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium text-gray-700">今後の予約</h2>
        {upcoming.length === 0 ? (
          <p className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-500">
            今後の予約はありません。
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                <span className="font-medium">{r.date}</span>
                <span>
                  {r.startTime}〜{r.endTime}
                </span>
                <span className="font-medium text-blue-700">
                  {r.resourceName}
                </span>
                {r.purpose && (
                  <span className="text-gray-500">{r.purpose}</span>
                )}
                <form action={cancelReservation} className="ml-auto">
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="rounded border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    取消
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-medium text-gray-700">過去の予約</h2>
        {past.length === 0 ? (
          <p className="text-sm text-gray-400">過去の予約はありません。</p>
        ) : (
          <ul className="space-y-1">
            {past.slice(0, 30).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap gap-x-4 rounded bg-white px-4 py-2 text-sm text-gray-500"
              >
                <span>{r.date}</span>
                <span>
                  {r.startTime}〜{r.endTime}
                </span>
                <span>{r.resourceName}</span>
                {r.purpose && <span>{r.purpose}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
