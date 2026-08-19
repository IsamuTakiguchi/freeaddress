import { and, asc, eq } from "drizzle-orm";
import { DateNav } from "@/components/DateNav";
import {
  ReservationGrid,
  type GridReservation,
  type GridResource,
} from "@/components/ReservationGrid";
import { db } from "@/db";
import { reservations, resources, users } from "@/db/schema";
import { daySlots, todayJst } from "@/lib/config";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function GridPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  const today = todayJst();
  const { date: rawDate } = await searchParams;
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : today;

  const activeResources: GridResource[] = db
    .select({
      id: resources.id,
      name: resources.name,
      type: resources.type,
      capacity: resources.capacity,
    })
    .from(resources)
    .where(eq(resources.isActive, 1))
    .orderBy(asc(resources.sortOrder), asc(resources.id))
    .all();

  const dayReservations: GridReservation[] = db
    .select({
      id: reservations.id,
      resourceId: reservations.resourceId,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      userId: reservations.userId,
      userName: users.name,
      purpose: reservations.purpose,
    })
    .from(reservations)
    .innerJoin(users, eq(reservations.userId, users.id))
    .where(and(eq(reservations.date, date)))
    .all();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">空き状況</h1>
        <DateNav date={date} today={today} />
      </div>
      <p className="text-xs text-gray-500">
        空いているマスをクリックすると予約できます。自分の予約（青）をクリックすると取り消せます。
      </p>
      {activeResources.length === 0 ? (
        <p className="rounded border border-gray-200 bg-white p-6 text-sm text-gray-500">
          設備が登録されていません。管理者に設備の登録を依頼してください。
        </p>
      ) : (
        <ReservationGrid
          resources={activeResources}
          reservations={dayReservations}
          slots={daySlots()}
          date={date}
          currentUserId={user.id}
          isAdmin={!!user.isAdmin}
        />
      )}
    </div>
  );
}
