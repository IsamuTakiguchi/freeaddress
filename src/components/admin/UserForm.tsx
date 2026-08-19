"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser, type ActionState } from "@/app/actions/admin";

export function UserForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createUser,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-2"
    >
      <div>
        <label className="mb-0.5 block text-xs text-gray-500">
          メールアドレス
        </label>
        <input
          name="email"
          type="email"
          required
          className="w-52 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-0.5 block text-xs text-gray-500">氏名</label>
        <input
          name="name"
          required
          className="w-32 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-0.5 block text-xs text-gray-500">
          パスワード（8文字以上）
        </label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-40 rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>
      <label className="flex items-center gap-1 pb-1.5 text-sm">
        <input type="checkbox" name="isAdmin" value="1" />
        管理者
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        追加
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
