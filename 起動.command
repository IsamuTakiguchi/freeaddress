#!/bin/bash
# フリーアドレス予約アプリ 起動用（Mac: ダブルクリックで起動 / Linux: ./起動.command）
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo " Node.js がインストールされていません。"
  echo ""
  echo " 1. https://nodejs.org/ja を開く"
  echo " 2. 「LTS」と書かれた緑のボタンからダウンロードしてインストール"
  echo " 3. インストール後、もう一度このファイルをダブルクリック"
  echo ""
  open "https://nodejs.org/ja" 2>/dev/null || true
  read -r -p "Enterキーで閉じます..."
  exit 1
fi

node scripts/launch.mjs
status=$?
if [ $status -ne 0 ]; then
  read -r -p "エラーが発生しました。Enterキーで閉じます..."
fi
exit $status
