import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "フリーアドレス予約",
  description: "テレワークブース・会議室の予約管理",
  appleWebApp: {
    capable: true,
    title: "予約アプリ", // ホーム画面追加時のアイコン下のラベル
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html lang="ja">
      <body className="min-h-screen">
        {user && <Nav userName={user.name} isAdmin={!!user.isAdmin} />}
        <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
