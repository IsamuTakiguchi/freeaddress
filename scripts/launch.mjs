// ダブルクリック起動用ランチャー（起動.bat / 起動.command から呼ばれる）
// Node.js の標準機能のみで動作し、初回は依存インストール〜DB作成〜ビルドまで自動で行う。
import { execSync, spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const PORT = Number(process.env.PORT || 3000);
const URL_LOCAL = `http://localhost:${PORT}`;

function log(msg) {
  console.log(`[予約アプリ] ${msg}`);
}

function run(command, label) {
  log(`${label}...`);
  const result = spawnSync(command, { shell: true, stdio: "inherit", cwd: ROOT });
  if (result.status !== 0) {
    log(`エラー: ${label}に失敗しました。上のメッセージを確認してください。`);
    process.exit(1);
  }
}

function serverAlive() {
  return new Promise((resolve) => {
    const req = http.get(URL_LOCAL, { timeout: 2000 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openBrowser(url) {
  try {
    if (process.platform === "win32") {
      execSync(`start "" "${url}"`, { shell: "cmd.exe" });
    } else if (process.platform === "darwin") {
      execSync(`open "${url}"`);
    } else {
      execSync(`xdg-open "${url}" >/dev/null 2>&1 &`, { shell: "/bin/sh" });
    }
  } catch {
    log(`ブラウザを自動で開けませんでした。手動で ${url} を開いてください。`);
  }
}

function lanUrls() {
  const urls = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) urls.push(`http://${a.address}:${PORT}`);
    }
  }
  return urls;
}

// 他の従業員のパソコンに配るデスクトップ用ショートカットを生成する
function writeShortcuts() {
  const [lan] = lanUrls();
  if (!lan) return;
  try {
    const dir = path.join(ROOT, "配布用ショートカット");
    fs.mkdirSync(dir, { recursive: true });
    // Windows 用（.url）
    fs.writeFileSync(
      path.join(dir, "予約アプリ.url"),
      `[InternetShortcut]\r\nURL=${lan}\r\n`,
    );
    // Mac 用（.webloc）
    fs.writeFileSync(
      path.join(dir, "予約アプリ.webloc"),
      `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>URL</key><string>${lan}</string></dict></plist>\n`,
    );
    console.log(
      `  「配布用ショートカット」フォルダに、他のパソコンのデスクトップに\n  コピーして使えるショートカットを作成しました。\n`,
    );
  } catch {
    // ショートカット生成は任意機能のため失敗しても無視
  }
}

// --- 既に起動済みなら、ブラウザを開くだけで終了 ---
if (await serverAlive()) {
  log("予約アプリは既に起動しています。ブラウザを開きます。");
  openBrowser(URL_LOCAL);
  process.exit(0);
}

// --- 初回セットアップ（必要なものだけ自動実行） ---
if (!fs.existsSync(path.join(ROOT, "node_modules"))) {
  log("初回起動の準備をしています（数分かかることがあります）");
  run("npm install", "必要なプログラムのインストール");
}

if (!fs.existsSync(path.join(ROOT, ".env"))) {
  const secret = randomBytes(32).toString("base64");
  const env = fs
    .readFileSync(path.join(ROOT, ".env.example"), "utf8")
    .replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${secret}`);
  fs.writeFileSync(path.join(ROOT, ".env"), env);
  log("設定ファイル（.env）を作成しました（暗号化キーは自動生成）");
}

const dbPath = process.env.DATABASE_PATH ?? path.join(ROOT, "data", "app.db");
if (!fs.existsSync(dbPath)) {
  run("npm run db:push", "データベースの作成");
  run("npm run db:seed", "初期データの登録");
}

if (!fs.existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
  run("npm run build", "アプリのビルド（初回のみ・1〜2分）");
}

// --- サーバー起動 ---
log("予約アプリを起動しています...");
const server = spawn("npm start", { shell: true, stdio: "inherit", cwd: ROOT });

server.on("exit", (code) => {
  log(`予約アプリが停止しました（コード: ${code ?? 0}）`);
  process.exit(code ?? 0);
});
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => server.kill());
}

// 起動を待ってブラウザを開く（最大30秒）
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  if (await serverAlive()) {
    console.log("");
    console.log("==========================================================");
    console.log("  予約アプリが起動しました");
    console.log(`  このパソコンでは:   ${URL_LOCAL}`);
    for (const u of lanUrls()) {
      console.log(`  他のパソコンからは: ${u}`);
    }
    console.log("");
    console.log("  ※ この黒い画面を閉じるとアプリ全体が停止します。");
    console.log("     画面は最小化してそのままにしてください。");
    console.log("==========================================================");
    console.log("");
    writeShortcuts();
    openBrowser(URL_LOCAL);
    break;
  }
}
