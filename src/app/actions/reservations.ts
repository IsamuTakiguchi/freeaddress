"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reservations, resources, users } from "@/db/schema";
import {
  deleteCalendarEvent,
  getAccessTokenForUser,
  insertCalendarEvent,
  isGoogleConfigured,
} from "@/lib/google";
import {
  ConflictError,
  createReservationTx,
  reservationInputSchema,
} from "@/lib/reservations";
import { requireUser } from "@/lib/session";

export interface ActionState {
  error?: string;
  success?: boolean;
}

export async function createReservation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = reservationInputSchema.safeParse({
    resourceId: formData.get("resourceId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    purpose: formData.get("purpose") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容が不正です" };
  }

  let reservationId: number;
  try {
    reservationId = createReservationTx(db, { ...parsed.data, userId: user.id });
  } catch (e) {
    if (e instanceof ConflictError) return { error: e.message };
    if (e instanceof Error && e.message.includes("設備")) {
      return { error: e.message };
    }
    return { error: "予約の作成に失敗しました" };
  }

  // Googleカレンダーへ自動登録（ベストエフォート：失敗しても予約は成立）
  if (isGoogleConfigured() && user.googleRefreshToken) {
    try {
      const accessToken = await getAccessTokenForUser(user);
      if (accessToken) {
        const resource = db
          .select({ name: resources.name })
          .from(resources)
          .where(eq(resources.id, parsed.data.resourceId))
          .get();
        const eventId = await insertCalendarEvent(accessToken, {
          resourceName: resource?.name ?? "設備",
          date: parsed.data.date,
          startTime: parsed.data.startTime,
          endTime: parsed.data.endTime,
          purpose: parsed.data.purpose,
        });
        if (eventId) {
          db.update(reservations)
            .set({ googleEventId: eventId })
            .where(eq(reservations.id, reservationId))
            .run();
        }
      }
    } catch (e) {
      console.error("Googleカレンダーへの登録に失敗:", e);
    }
  }

  revalidatePath("/grid");
  revalidatePath("/my");
  return { success: true };
}

export async function cancelReservation(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const reservation = db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .get();
  if (!reservation) return;

  // 本人または管理者のみキャンセル可能
  if (reservation.userId !== user.id && !user.isAdmin) return;

  db.delete(reservations).where(eq(reservations.id, id)).run();

  // 予約者本人のGoogleカレンダーからイベント削除（管理者による取消でも予約者のカレンダーを対象にする）
  if (isGoogleConfigured() && reservation.googleEventId) {
    try {
      const owner =
        reservation.userId === user.id
          ? user
          : db.select().from(users).where(eq(users.id, reservation.userId)).get();
      if (owner?.googleRefreshToken) {
        const accessToken = await getAccessTokenForUser(owner);
        if (accessToken) {
          await deleteCalendarEvent(accessToken, reservation.googleEventId);
        }
      }
    } catch (e) {
      console.error("Googleカレンダーからの削除に失敗:", e);
    }
  }

  revalidatePath("/grid");
  revalidatePath("/my");
  revalidatePath("/admin/reservations");
}
