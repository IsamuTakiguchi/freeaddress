import { asc, eq } from "drizzle-orm";
import { cancelReservation } from "@/app/actions/reservations";
import { db } from "@/db";
import { reservations, resources, users } from "@/db/schema";
import { todayJst } from "@/lib/config";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const today = todayJst();
  const { date: rawDate } = await searchParams;
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;

  const rows = db
    .select({
      id: reservations.id,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      purpose: reservations.purpose,
      resourceName: resources.name,
      userName: users.name,
      userEmail: users.email,
    })
    .from(reservations)
    .innerJoin(resources, eq(reservations.resourceId, resources.id))
    .innerJoin(users, eq(reservations.userId, users.id))
    .where(eq(reservations.date, date))
    .orderBy(asc(reservations.startTime))
    .all();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">予約一覧</h1>
      <form className="flex items-center gap-2 text-sm">
        <label htmlFor="date" className="text-gray-600">
          日付：
        </label>
        <input
          id="date"
          type="date"
          name="date"
          defaultValue={date}
          className="rounded border border-gray-300 bg-white px-2 py-1.5"
        />
        <button
          type="submit"
          className="rounded border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-50"
        >
          表示
        </button>
        <Link href="/admin/reservations" className="text-blue-600 underline">
          今日
        </Link>
      </form>

      {rows.length === 0 ? (
        <p className="rounded border border-gray-200 bg-white p-6 text-sm text-gray-500">
          {date} の予約はありません。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
                <th className="px-4 py-2">時間</th>
                <th className="px-4 py-2">設備</th>
                <th className="px-4 py-2">予約者</th>
                <th className="px-4 py-2">利用目的</th>
                <th className="px-4 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.startTime}〜{r.endTime}
                  </td>
                  <td className="px-4 py-2 font-medium">{r.resourceName}</td>
                  <td className="px-4 py-2">
                    {r.userName}
                    <span className="ml-1 text-xs text-gray-400">
                      {r.userEmail}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {r.purpose ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <form action={cancelReservation}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        取消
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
