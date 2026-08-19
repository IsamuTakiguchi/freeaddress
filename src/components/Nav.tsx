import Link from "next/link";
import { logout } from "@/app/actions/auth";

export function Nav({
  userName,
  isAdmin,
}: {
  userName: string;
  isAdmin: boolean;
}) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-3 py-3 sm:px-6">
        <Link href="/grid" className="text-lg font-bold text-blue-700">
          フリーアドレス予約
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/grid" className="text-gray-700 hover:text-blue-700">
            空き状況
          </Link>
          <Link href="/my" className="text-gray-700 hover:text-blue-700">
            マイ予約
          </Link>
          {isAdmin && (
            <Link
              href="/admin/resources"
              className="text-gray-700 hover:text-blue-700"
            >
              管理
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-gray-600">{userName} さん</span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-50"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
