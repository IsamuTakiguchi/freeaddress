import { asc } from "drizzle-orm";
import { deleteUser, setUserAdmin } from "@/app/actions/admin";
import { UserForm } from "@/components/admin/UserForm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const all = db.select().from(users).orderBy(asc(users.id)).all();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">ユーザー管理</h1>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-medium text-gray-700">ユーザーの追加</h2>
        <UserForm />
      </section>

      <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-2">氏名</th>
              <th className="px-4 py-2">メールアドレス</th>
              <th className="px-4 py-2">権限</th>
              <th className="px-4 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {all.map((u) => (
              <tr key={u.id} className="border-b border-gray-100">
                <td className="px-4 py-2 font-medium">
                  {u.name}
                  {u.id === me.id && (
                    <span className="ml-1 text-xs text-gray-400">（自分）</span>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-600">{u.email}</td>
                <td className="px-4 py-2">
                  {u.isAdmin ? (
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                      管理者
                    </span>
                  ) : (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      一般
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    {u.id !== me.id && (
                      <>
                        <form action={setUserAdmin}>
                          <input type="hidden" name="id" value={u.id} />
                          <input
                            type="hidden"
                            name="isAdmin"
                            value={u.isAdmin ? "0" : "1"}
                          />
                          <button
                            type="submit"
                            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                          >
                            {u.isAdmin ? "管理者を解除" : "管理者にする"}
                          </button>
                        </form>
                        <form action={deleteUser}>
                          <input type="hidden" name="id" value={u.id} />
                          <button
                            type="submit"
                            className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            削除
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-gray-500">
        ※ ユーザーを削除すると、そのユーザーの予約もすべて削除されます。
      </p>
    </div>
  );
}
