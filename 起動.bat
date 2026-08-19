@echo off
chcp 65001 >nul
cd /d "%~dp0"
title フリーアドレス予約アプリ

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js がインストールされていません。
  echo.
  echo  1. https://nodejs.org/ja を開く
  echo  2. 「LTS」と書かれた緑のボタンからダウンロードしてインストール
  echo  3. インストール後、もう一度このファイルをダブルクリック
  echo.
  start "" "https://nodejs.org/ja"
  pause
  exit /b 1
)

node scripts\launch.mjs
if errorlevel 1 pause
