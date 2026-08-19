import { asc, like } from "drizzle-orm";
import { db } from "@/db";
import { reservations, resources } from "@/db/schema";
import { SLOTS_PER_DAY, todayJst } from "@/lib/config";
import { slotCount, utilizationPercent } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: rawMonth } = await searchParams;
  const month =
    rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)
      ? rawMonth
      : todayJst().slice(0, 7);

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const totalSlots = daysInMonth * SLOTS_PER_DAY;

  const allResources = db
    .select()
    .from(resources)
    .orderBy(asc(resources.sortOrder), asc(resources.id))
    .all();

  const monthReservations = db
    .select({
      resourceId: reservations.resourceId,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
    })
    .from(reservations)
    .where(like(reservations.date, `${month}-%`))
    .all();

  const stats = allResources.map((res) => {
    const own = monthReservations.filter((r) => r.resourceId === res.id);
    const bookedSlots = own.reduce(
      (sum, r) => sum + slotCount(r.startTime, r.endTime),
      0,
    );
    return {
      resource: res,
      count: own.length,
      bookedSlots,
      utilization: utilizationPercent(bookedSlots, totalSlots),
    };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">利用状況</h1>
      <form className="flex items-center gap-2 text-sm">
        <label htmlFor="month" className="text-gray-600">
          対象月：
        </label>
        <input
          id="month"
          type="month"
          name="month"
          defaultValue={month}
          className="rounded border border-gray-300 bg-white px-2 py-1.5"
        />
        <button
          type="submit"
          className="rounded border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-50"
        >
          表示
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-2">設備</th>
              <th className="px-4 py-2 text-right">予約件数</th>
              <th className="px-4 py-2 text-right">予約時間</th>
              <th className="px-4 py-2">稼働率</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(({ resource, count, bookedSlots, utilization }) => (
              <tr key={resource.id} className="border-b border-gray-100">
                <td className="px-4 py-2 font-medium">
                  {resource.name}
                  {!resource.isActive && (
                    <span className="ml-1 text-xs text-gray-400">（無効）</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">{count} 件</td>
                <td className="px-4 py-2 text-right">
                  {(bookedSlots / 2).toFixed(1)} 時間
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-40 overflow-hidden rounded bg-gray-100">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                    <span className="w-14 text-right text-xs text-gray-600">
                      {utilization}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        ※ 稼働率は営業時間（8:00〜20:00）の全スロットに対する予約済み時間の割合です（全日ベース）。
      </p>
    </div>
  );
}
