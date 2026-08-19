// Railway等の本番環境用の起動スクリプト。
// 起動のたびにDBスキーマを確認・作成（冪等）し、ユーザーが1人もいなければ
// 初期データを投入してから next start を実行する。
// devDependencies（drizzle-kit / tsx）に依存しないよう、本番依存のみで動作させる。
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DATABASE_PATH ?? "./data/app.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");

// --- スキーマ作成（src/db/schema.ts と同一。変更時は両方を更新すること） ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
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
  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS reservations (
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
  CREATE INDEX IF NOT EXISTS idx_reservations_resource_date
    ON reservations(resource_id, date);
`);

// 旧バージョンのDBに後から追加されたカラムを補う（存在しなければ ALTER TABLE）
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    console.log(`[起動] ${table}.${column} カラムを追加しました`);
  }
}
ensureColumn("users", "google_email", "google_email TEXT");
ensureColumn("users", "google_refresh_token", "google_refresh_token TEXT");
ensureColumn("users", "google_access_token", "google_access_token TEXT");
ensureColumn("users", "google_token_expires_at", "google_token_expires_at INTEGER");
ensureColumn("reservations", "google_event_id", "google_event_id TEXT");

// --- 初期データ（ユーザーが1人もいない場合のみ） ---
const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
if (userCount === 0) {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";
  db.prepare(
    "INSERT INTO users (email, name, password_hash, is_admin) VALUES (?, ?, ?, 1)",
  ).run(adminEmail, "管理者", bcrypt.hashSync(adminPassword, 10));

  const insertResource = db.prepare(
    "INSERT INTO resources (name, type, capacity, sort_order) VALUES (?, ?, ?, ?)",
  );
  insertResource.run("テレワークブース１", "booth", 1, 1);
  insertResource.run("テレワークブース２", "booth", 1, 2);
  insertResource.run("会議室Ａ", "room", 6, 10);
  insertResource.run("会議室Ｂ", "room", 10, 11);

  console.log(`[起動] 初期データを投入しました（管理者: ${adminEmail}）`);
}
db.close();

// --- Next.js 起動（Railway が指定する PORT を next start が自動で使う） ---
if (!process.env.SESSION_SECRET) {
  console.warn(
    "[起動] 警告: SESSION_SECRET が未設定です。環境変数に必ず設定してください。",
  );
}
const server = spawn("npx next start", {
  shell: true,
  stdio: "inherit",
});
server.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => server.kill(sig));
}
