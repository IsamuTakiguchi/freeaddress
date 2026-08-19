import { and, eq, gt, lt } from "drizzle-orm";
import { z } from "zod";
import { type DB } from "@/db";
import { reservations, resources } from "@/db/schema";
import {
  CLOSE_TIME,
  OPEN_TIME,
  SLOT_MINUTES,
  timeToMinutes,
} from "@/lib/config";

// 時間帯 [aStart, aEnd) と [bStart, bEnd) が重なるか（"HH:MM" は辞書順比較で正しい）
export function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// 営業時間内かつ30分境界の時刻か
export function isValidSlotTime(time: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const minutes = timeToMinutes(time);
  return (
    minutes >= timeToMinutes(OPEN_TIME) &&
    minutes <= timeToMinutes(CLOSE_TIME) &&
    minutes % SLOT_MINUTES === 0
  );
}

export const reservationInputSchema = z
  .object({
    resourceId: z.coerce.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が不正です"),
    startTime: z.string().refine(isValidSlotTime, "開始時刻が不正です"),
    endTime: z.string().refine(isValidSlotTime, "終了時刻が不正です"),
    purpose: z
      .string()
      .trim()
      .max(200, "利用目的は200文字以内で入力してください")
      .optional(),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: "終了時刻は開始時刻より後にしてください",
    path: ["endTime"],
  });

export type ReservationInput = z.infer<typeof reservationInputSchema>;

export class ConflictError extends Error {
  constructor() {
    super("この時間帯は既に予約されています");
  }
}

// トランザクション内で重複チェック＋INSERT（better-sqlite3 は同期実行のため競合安全）
export function createReservationTx(
  database: DB,
  input: ReservationInput & { userId: number },
): number {
  return database.transaction((tx) => {
    const resource = tx
      .select()
      .from(resources)
      .where(eq(resources.id, input.resourceId))
      .get();
    if (!resource || !resource.isActive) {
      throw new Error("指定された設備は利用できません");
    }

    const conflict = tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.resourceId, input.resourceId),
          eq(reservations.date, input.date),
          lt(reservations.startTime, input.endTime),
          gt(reservations.endTime, input.startTime),
        ),
      )
      .limit(1)
      .get();
    if (conflict) throw new ConflictError();

    const inserted = tx
      .insert(reservations)
      .values({
        resourceId: input.resourceId,
        userId: input.userId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        purpose: input.purpose || null,
      })
      .returning({ id: reservations.id })
      .get();
    return inserted.id;
  });
}

// 稼働率（%）: 予約済みスロット数 ÷ 営業スロット総数
export function utilizationPercent(
  bookedSlots: number,
  totalSlots: number,
): number {
  if (totalSlots <= 0) return 0;
  return Math.round((bookedSlots / totalSlots) * 1000) / 10;
}

// 予約1件が占めるスロット数
export function slotCount(startTime: string, endTime: string): number {
  return (timeToMinutes(endTime) - timeToMinutes(startTime)) / SLOT_MINUTES;
}
