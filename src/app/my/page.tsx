import { asc, desc, eq } from "drizzle-orm";
import { cancelReservation } from "@/app/actions/reservations";
import { db } from "@/db";
import { reservations, resources } from "@/db/schema";
import { todayJst } from "@/lib/config";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const user = await requireUser();
  const today = todayJst();

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
