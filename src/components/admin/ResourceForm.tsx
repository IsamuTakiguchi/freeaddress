"use client";

import { useActionState } from "react";
import {
  createResource,
  updateResource,
  type ActionState,
} from "@/app/actions/admin";
import type { ResourceType } from "@/lib/config";

export function ResourceForm({
  resource,
}: {
  resource?: {
    id: number;
    name: string;
    type: ResourceType;
    capacity: number;
    sortOrder: number;
  };
}) {
  const action = resource ? updateResource : createResource;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      {resource && <input type="hidden" name="id" value={resource.id} />}
      <div>
        <label className="mb-0.5 block text-xs text-gray-500">名称</label>
        <input
          name="name"
          required
          defaultValue={resource?.name}
          placeholder="例：会議室Ｃ"
          className="w-40 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-0.5 block text-xs text-gray-500">種別</label>
        <select
          name="type"
          defaultValue={resource?.type ?? "booth"}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="booth">テレワークブース</option>
          <option value="room">会議室</option>
        </select>
      </div>
      <div>
        <label className="mb-0.5 block text-xs text-gray-500">定員</label>
        <input
          name="capacity"
          type="number"
          min={1}
          max={100}
          required
          defaultValue={resource?.capacity ?? 1}
          className="w-16 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-0.5 block text-xs text-gray-500">表示順</label>
        <input
          name="sortOrder"
          type="number"
          defaultValue={resource?.sortOrder ?? 0}
          className="w-16 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className={`rounded px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
          resource
            ? "bg-gray-600 hover:bg-gray-700"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {resource ? "更新" : "追加"}
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
