# フリーアドレス予約管理アプリ

フリーアドレスオフィス向けの、テレワークブース・会議室の予約管理Webアプリです。

## 主な機能

- **空き状況グリッド** — 日付ごとに設備×30分スロットの空き状況を一覧表示。空きマスをクリックして予約、自分の予約をクリックして取消
- **マイ予約** — 自分の今後/過去の予約一覧とキャンセル
- **簡易ログイン** — メールアドレス＋パスワード（暗号化Cookieセッション）
- **二重予約の防止** — トランザクション内の重複チェックで同一時間帯の重複予約を排除
- **管理者機能**
  - 設備管理（追加・編集・無効化 ※過去の予約と統計は保全）
  - ユーザー管理（追加・削除・管理者権限の切替）
  - 予約一覧（日付別の全予約表示・任意の予約の取消）
  - 利用状況（月別の予約件数・予約時間・稼働率）

## 技術構成

- [Next.js](https://nextjs.org/)（App Router / Server Actions）+ TypeScript + Tailwind CSS
- SQLite（[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)）+ [Drizzle ORM](https://orm.drizzle.team/)
- [iron-session](https://github.com/vvo/iron-session)（暗号化Cookieセッション）+ bcryptjs
- 1サーバーで完結（外部DB・外部サービス不要）

## セットアップ

```bash
npm install
cp .env.example .env        # SESSION_SECRET を必ず変更してください
npm run db:push             # データベース作成（./data/app.db）
npm run db:seed             # 初期データ投入（管理者・サンプル設備）
npm run dev                 # http://localhost:3000
```

シード後の初期アカウント（`.env` の `SEED_ADMIN_*` で変更可能）:

| 役割 | メールアドレス | パスワード |
|---|---|---|
| 管理者 | admin@example.com | admin1234 |
| 一般ユーザー | user@example.com | user1234 |

**運用開始前に必ず初期パスワードを変更（ユーザーを作り直し）してください。**

## 本番デプロイ（VPS・社内サーバー）

```bash
npm run build
npm start                   # ポート3000で起動
```

- リバースプロキシ（nginx 等）の背後でHTTPSで公開してください（`NODE_ENV=production` ではCookieに `Secure` 属性が付きます）
- `DATABASE_PATH` でDBファイルの配置先を変更できます。バックアップは `data/` ディレクトリをコピーするだけです

## 設定の変更

営業時間・スロット幅は `src/lib/config.ts` で変更できます（既定: 8:00〜20:00・30分単位）。

## テスト

```bash
npm test    # Vitest（重複判定・バリデーション・稼働率・競合トランザクション）
```
