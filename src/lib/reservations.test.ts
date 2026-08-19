import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { describe, expect, it } from "vitest";
import * as schema from "@/db/schema";
import {
  ConflictError,
  createReservationTx,
  isValidSlotTime,
  overlaps,
  reservationInputSchema,
  slotCount,
  utilizationPercent,
} from "./reservations";

describe("overlaps", () => {
  it("重なる時間帯を検出する", () => {
    expect(overlaps("10:00", "11:00", "10:30", "11:30")).toBe(true);
    expect(overlaps("10:00", "11:00", "09:00", "10:30")).toBe(true);
    expect(overlaps("10:00", "11:00", "10:00", "11:00")).toBe(true);
    expect(overlaps("09:00", "12:00", "10:00", "10:30")).toBe(true);
  });
  it("隣接する時間帯は重ならない", () => {
    expect(overlaps("10:00", "11:00", "11:00", "11:30")).toBe(false);
    expect(overlaps("10:00", "11:00", "09:00", "10:00")).toBe(false);
  });
});

describe("isValidSlotTime", () => {
  it("営業時間内の30分境界を許可する", () => {
    expect(isValidSlotTime("08:00")).toBe(true);
    expect(isValidSlotTime("13:30")).toBe(true);
    expect(isValidSlotTime("20:00")).toBe(true);
  });
  it("境界外・営業時間外を拒否する", () => {
    expect(isValidSlotTime("10:15")).toBe(false);
    expect(isValidSlotTime("07:30")).toBe(false);
    expect(isValidSlotTime("20:30")).toBe(false);
    expect(isValidSlotTime("abc")).toBe(false);
  });
});

describe("reservationInputSchema", () => {
  const base = {
    resourceId: "1",
    date: "2026-08-20",
    startTime: "10:00",
    endTime: "11:00",
  };
  it("正常な入力を受け付ける", () => {
    expect(reservationInputSchema.safeParse(base).success).toBe(true);
  });
  it("開始 >= 終了を拒否する", () => {
    expect(
      reservationInputSchema.safeParse({ ...base, endTime: "10:00" }).success,
    ).toBe(false);
    expect(
      reservationInputSchema.safeParse({ ...base, endTime: "09:00" }).success,
    ).toBe(false);
  });
  it("30分境界でない時刻を拒否する", () => {
    expect(
      reservationInputSchema.safeParse({ ...base, startTime: "10:10" }).success,
    ).toBe(false);
  });
});

describe("utilizationPercent / slotCount", () => {
  it("稼働率を計算する", () => {
    expect(utilizationPercent(12, 24)).toBe(50);
    expect(utilizationPercent(0, 24)).toBe(0);
    expect(utilizationPercent(1, 3)).toBe(33.3);
    expect(utilizationPercent(5, 0)).toBe(0);
  });
  it("スロット数を計算する", () => {
    expect(slotCount("10:00", "11:00")).toBe(2);
    expect(slotCount("10:00", "10:30")).toBe(1);
  });
});

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      google_email TEXT,
      google_refresh_token TEXT,
      google_access_token TEXT,
      google_token_expires_at INTEGER
    );
    CREATE TABLE resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER NOT NULL REFERENCES resources(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      purpose TEXT,
      google_event_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const db = drizzle(sqlite, { schema });
  db.insert(schema.users)
    .values({ email: "a@example.com", name: "A", passwordHash: "x" })
    .run();
  db.insert(schema.resources)
    .values({ name: "ブース１", type: "booth" })
    .run();
  return db;
}

describe("createReservationTx", () => {
  const input = {
    resourceId: 1,
    userId: 1,
    date: "2026-08-20",
    startTime: "10:00",
    endTime: "11:00",
  };

  it("予約を作成できる", () => {
    const db = createTestDb();
    const id = createReservationTx(db, input);
    expect(id).toBeGreaterThan(0);
  });

  it("同一時間帯の二重予約は1件のみ成功する", () => {
    const db = createTestDb();
    createReservationTx(db, input);
    expect(() =>
      createReservationTx(db, { ...input, startTime: "10:30", endTime: "11:30" }),
    ).toThrow(ConflictError);
    const rows = db.select().from(schema.reservations).all();
    expect(rows.length).toBe(1);
  });

  it("隣接する時間帯は予約できる", () => {
    const db = createTestDb();
    createReservationTx(db, input);
    const id = createReservationTx(db, {
      ...input,
      startTime: "11:00",
      endTime: "11:30",
    });
    expect(id).toBeGreaterThan(0);
  });

  it("無効化された設備は予約できない", () => {
    const db = createTestDb();
    db.update(schema.resources).set({ isActive: 0 }).run();
    expect(() => createReservationTx(db, input)).toThrow("設備");
  });
});
