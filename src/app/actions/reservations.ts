"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reservations } from "@/db/schema";
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

  try {
    createReservationTx(db, { ...parsed.data, userId: user.id });
  } catch (e) {
    if (e instanceof ConflictError) return { error: e.message };
    if (e instanceof Error && e.message.includes("設備")) {
      return { error: e.message };
    }
    return { error: "予約の作成に失敗しました" };
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

  revalidatePath("/grid");
  revalidatePath("/my");
  revalidatePath("/admin/reservations");
}
