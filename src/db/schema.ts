import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: integer("is_admin").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  // Googleカレンダー連携（未連携なら null）
  googleEmail: text("google_email"),
  googleRefreshToken: text("google_refresh_token"),
  googleAccessToken: text("google_access_token"),
  googleTokenExpiresAt: integer("google_token_expires_at"), // epoch ms
});

export const resources = sqliteTable("resources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ["booth", "room"] }).notNull(),
  capacity: integer("capacity").notNull().default(1),
  isActive: integer("is_active").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const reservations = sqliteTable(
  "reservations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    resourceId: integer("resource_id")
      .notNull()
      .references(() => resources.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    date: text("date").notNull(), // "YYYY-MM-DD" (JST)
    startTime: text("start_time").notNull(), // "HH:MM" 30分境界
    endTime: text("end_time").notNull(), // "HH:MM" 30分境界, start < end
    purpose: text("purpose"),
    googleEventId: text("google_event_id"), // 予約者のGoogleカレンダーに作成したイベントID
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("idx_reservations_resource_date").on(table.resourceId, table.date)],
);

export type User = typeof users.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
