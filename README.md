# フリーアドレス予約管理アプリ

フリーアドレスオフィス向けの、テレワークブース・会議室の予約管理Webアプリです。

## 主な機能

- **空き状況グリッド** — 日付ごとに設備×30分スロットの空き状況を一覧表示。空きマスをクリックして予約、自分の予約をクリックして取消
- **マイ予約** — 自分の今後/過去の予約一覧とキャンセル
- **簡易ログイン** — メールアドレス＋パスワード（暗号化Cookieセッション）
- **二重予約の防止** — トランザクション内の重複チェックで同一時間帯の重複予約を排除
- **Googleカレンダー連携（任意）** — 各ユーザーが自分のGoogleアカウントを連携すると、予約作成時に自動でGoogleカレンダーへ登録され、予約取消時に自動削除されます
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

## かんたん起動（ダブルクリック）

オフィスの1台のパソコンをサーバー役にして、そのパソコンで起動ファイルをダブルクリックするだけで使えます。ターミナル操作は不要です。

1. [Node.js](https://nodejs.org/ja)（LTS版）をインストール（未インストールなら起動時に案内が表示されます）
2. このフォルダ内の起動ファイルをダブルクリック
   - **Windows**: `起動.bat`
   - **Mac**: `起動.command`（初回は右クリック→「開く」が必要な場合があります）
3. 初回は自動で準備（依存インストール・設定ファイル作成・データベース作成・ビルド）が行われ、数分後にブラウザが自動で開きます。2回目以降は数秒で起動します

起動後の黒い画面（コンソール）には、**他のパソコンからアクセスするためのURL**（例 `http://192.168.1.10:3000`）が表示されます。この画面を閉じるとアプリ全体が停止するので、最小化したままにしてください。

他の従業員のパソコンには、起動時に自動生成される **`配布用ショートカット` フォルダ内のショートカット**（Windows用 `.url` / Mac用 `.webloc`）をデスクトップにコピーして配ると、ダブルクリックでブラウザが開くようになります（ブラウザのブックマークでも構いません）。

- 設定ファイル（`.env`）は初回起動時に自動作成され、セッション暗号化キーも自動生成されます
- 毎日使う場合は、起動ファイルのショートカットをWindowsの「スタートアップ」フォルダ（`Win+R` → `shell:startup`）に入れておくと、サーバー役PCの電源を入れるだけで自動起動します

## 手動セットアップ（コマンド操作に慣れている場合）

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

## Googleカレンダー連携の設定

この機能は任意です。未設定でもアプリ本体は動作します（連携UIに「利用できません」と表示されるだけです）。

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成（既存プロジェクトでも可）
2. 「APIとサービス → ライブラリ」で **Google Calendar API** を有効化
3. 「APIとサービス → OAuth同意画面」を設定
   - Google Workspace利用組織なら User Type は「内部」が簡単です
   - 「外部」の場合はテストユーザーに利用者のGmailアドレスを追加（または公開設定）
   - スコープに `.../auth/calendar.events` と `openid` `email` を追加
4. 「APIとサービス → 認証情報 → 認証情報を作成 → OAuthクライアントID」
   - アプリケーションの種類：**ウェブアプリケーション**
   - 承認済みのリダイレクトURI：`{APP_URL}/api/google/callback`
     （例：`http://localhost:3000/api/google/callback`、本番なら `https://yaku.example.com/api/google/callback`）
5. 発行されたクライアントIDとシークレットを `.env` に設定

```bash
APP_URL=https://yoyaku.example.com   # アプリの公開URL（末尾スラッシュなし）
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
```

6. アプリを再起動すると、各ユーザーの「マイ予約」画面に「Googleカレンダーと連携する」ボタンが表示されます

連携の仕様:

- 予約作成 → 予約者のGoogleカレンダー（メインカレンダー）に「【予約】設備名」のイベントを自動登録
- 予約取消（管理者による取消を含む）→ 予約者のカレンダーからイベントを自動削除
- カレンダー登録に失敗しても予約自体は成立します（ベストエフォート）
- 連携解除は「マイ予約」画面からいつでも可能（Google側のアカウント設定からも取り消せます）

## 設定の変更

営業時間・スロット幅は `src/lib/config.ts` で変更できます（既定: 8:00〜20:00・30分単位）。

## テスト

```bash
npm test    # Vitest（重複判定・バリデーション・稼働率・競合トランザクション）
```
