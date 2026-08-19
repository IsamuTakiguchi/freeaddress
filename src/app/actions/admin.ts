"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { reservations, resources, users } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export interface ActionState {
  error?: string;
  success?: boolean;
}

const resourceSchema = z.object({
  name: z.string().trim().min(1, "名称を入力してください").max(50),
  type: z.enum(["booth", "room"]),
  capacity: z.coerce.number().int().min(1, "定員は1以上にしてください").max(100),
  sortOrder: z.coerce.number().int().default(0),
});

export async function createResource(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = resourceSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    capacity: formData.get("capacity"),
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容が不正です" };
  }
  db.insert(resources).values(parsed.data).run();
  revalidatePath("/admin/resources");
  revalidatePath("/grid");
  return { success: true };
}

export async function updateResource(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const parsed = resourceSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    capacity: formData.get("capacity"),
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!Number.isInteger(id) || !parsed.success) {
    return { error: "入力内容が不正です" };
  }
  db.update(resources).set(parsed.data).where(eq(resources.id, id)).run();
  revalidatePath("/admin/resources");
  revalidatePath("/grid");
  return { success: true };
}

// ソフトデリート（過去の予約・統計を保全するため実削除はしない）
export async function setResourceActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const active = formData.get("active") === "1" ? 1 : 0;
  if (!Number.isInteger(id)) return;
  db.update(resources).set({ isActive: active }).where(eq(resources.id, id)).run();
  revalidatePath("/admin/resources");
  revalidatePath("/grid");
}

const userSchema = z.object({
  email: z.email("メールアドレスの形式が不正です").max(200),
  name: z.string().trim().min(1, "氏名を入力してください").max(50),
  password: z.string().min(8, "パスワードは8文字以上にしてください").max(100),
  isAdmin: z.coerce.number().int().min(0).max(1).default(0),
});

export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = userSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    name: formData.get("name"),
    password: formData.get("password"),
    isAdmin: formData.get("isAdmin") ? 1 : 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容が不正です" };
  }
  const existing = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .get();
  if (existing) return { error: "このメールアドレスは既に登録されています" };

  db.insert(users)
    .values({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash: bcrypt.hashSync(parsed.data.password, 10),
      isAdmin: parsed.data.isAdmin,
    })
    .run();
  revalidatePath("/admin/users");
  return { success: true };
}

export async function setUserAdmin(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  const isAdmin = formData.get("isAdmin") === "1" ? 1 : 0;
  if (!Number.isInteger(id)) return;
  // 自分自身の管理者権限は外せない（管理者不在を防ぐ）
  if (id === admin.id && isAdmin === 0) return;
  db.update(users).set({ isAdmin }).where(eq(users.id, id)).run();
  revalidatePath("/admin/users");
}

export async function deleteUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id === admin.id) return;

  // 削除前に、Googleカレンダーに登録済みのイベントを控えておく
  const target = db.select().from(users).where(eq(users.id, id)).get();
  const syncedEventIds = db
    .select({ googleEventId: reservations.googleEventId })
    .from(reservations)
    .where(eq(reservations.userId, id))
    .all()
    .map((r) => r.googleEventId)
    .filter((e): e is string => !!e);

  // 予約が残っているユーザーは予約ごと削除する
  db.transaction((tx) => {
    tx.delete(reservations).where(eq(reservations.userId, id)).run();
    tx.delete(users).where(eq(users.id, id)).run();
  });

  // 本人のGoogleカレンダーからもベストエフォートで削除
  if (target?.googleRefreshToken && syncedEventIds.length > 0) {
    try {
      const { getAccessTokenForUser, deleteCalendarEvent } = await import(
        "@/lib/google"
      );
      const accessToken = await getAccessTokenForUser(target);
      if (accessToken) {
        for (const eventId of syncedEventIds) {
          await deleteCalendarEvent(accessToken, eventId);
        }
      }
    } catch (e) {
      console.error("Googleカレンダーからの削除に失敗:", e);
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/grid");
}
