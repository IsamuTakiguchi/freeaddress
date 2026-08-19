import { asc } from "drizzle-orm";
import { setResourceActive } from "@/app/actions/admin";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { db } from "@/db";
import { resources } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminResourcesPage() {
  const all = db
    .select()
    .from(resources)
    .orderBy(asc(resources.sortOrder), asc(resources.id))
    .all();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">設備管理</h1>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-medium text-gray-700">設備の追加</h2>
        <ResourceForm />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-gray-700">登録済みの設備</h2>
        {all.length === 0 && (
          <p className="text-sm text-gray-500">設備が登録されていません。</p>
        )}
        {all.map((r) => (
          <div
            key={r.id}
            className={`flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-4 ${
              r.isActive ? "bg-white" : "bg-gray-100 opacity-70"
            }`}
          >
            <div className="grow">
              <ResourceForm
                resource={{
                  id: r.id,
                  name: r.name,
                  type: r.type,
                  capacity: r.capacity,
                  sortOrder: r.sortOrder,
                }}
              />
            </div>
            <form action={setResourceActive}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="active" value={r.isActive ? "0" : "1"} />
              <button
                type="submit"
                className={`rounded border px-3 py-1.5 text-sm ${
                  r.isActive
                    ? "border-red-300 text-red-600 hover:bg-red-50"
                    : "border-green-400 text-green-700 hover:bg-green-50"
                }`}
              >
                {r.isActive ? "無効化" : "有効化"}
              </button>
            </form>
            {!r.isActive && (
              <span className="text-xs text-gray-500">（無効：予約不可）</span>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
