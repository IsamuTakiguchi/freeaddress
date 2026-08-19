"use client";

import { useActionState, useEffect } from "react";
import {
  createReservation,
  type ActionState,
} from "@/app/actions/reservations";

export interface BookingTarget {
  resourceId: number;
  resourceName: string;
  date: string;
  startTime: string;
  endTime: string;
}

export function BookingModal({
  target,
  slotTimes,
  onClose,
}: {
  target: BookingTarget;
  slotTimes: string[]; // スロット開始時刻の一覧
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createReservation,
    {},
  );

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  // 終了時刻の候補 = 各スロットの終了境界（開始時刻の30分後〜営業終了）
  const lastSlot = slotTimes[slotTimes.length - 1];
  const endOptions = [...slotTimes.slice(1), endOfSlot(lastSlot)];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold">予約の作成</h2>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="resourceId" value={target.resourceId} />
          <input type="hidden" name="date" value={target.date} />
          <div className="rounded bg-gray-50 px-3 py-2 text-sm">
            <div>
              <span className="text-gray-500">設備：</span>
              {target.resourceName}
            </div>
            <div>
              <span className="text-gray-500">日付：</span>
              {target.date}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">開始</label>
              <select
                name="startTime"
                defaultValue={target.startTime}
                className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
              >
                {slotTimes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <span className="mt-6 text-gray-400">〜</span>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">終了</label>
              <select
                name="endTime"
                defaultValue={target.endTime}
                className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
              >
                {endOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="purpose" className="mb-1 block text-sm font-medium">
              利用目的（任意）
            </label>
            <input
              id="purpose"
              name="purpose"
              type="text"
              maxLength={200}
              placeholder="例：○○案件の打合せ"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {pending ? "予約中..." : "予約する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function endOfSlot(start: string): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + 30;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
