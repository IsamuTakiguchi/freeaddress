"use client";

import { useRouter } from "next/navigation";

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateNav({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  const go = (d: string) => router.push(`/grid?date=${d}`);

  const weekday = ["日", "月", "火", "水", "木", "金", "土"][
    new Date(`${date}T00:00:00`).getDay()
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => go(addDays(date, -1))}
        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        ← 前日
      </button>
      <button
        onClick={() => go(today)}
        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        今日
      </button>
      <button
        onClick={() => go(addDays(date, 1))}
        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        翌日 →
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
      />
      <span className="text-sm font-medium text-gray-700">（{weekday}）</span>
    </div>
  );
}
