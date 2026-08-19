import Link from "next/link";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 text-sm">
        <Link
          href="/admin/resources"
          className="rounded px-3 py-1.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
        >
          設備管理
        </Link>
        <Link
          href="/admin/users"
          className="rounded px-3 py-1.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
        >
          ユーザー管理
        </Link>
        <Link
          href="/admin/reservations"
          className="rounded px-3 py-1.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
        >
          予約一覧
        </Link>
        <Link
          href="/admin/stats"
          className="rounded px-3 py-1.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
        >
          利用状況
        </Link>
      </nav>
      {children}
    </div>
  );
}
