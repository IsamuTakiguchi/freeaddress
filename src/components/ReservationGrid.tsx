"use client";

import { useState, useTransition } from "react";
import { cancelReservation } from "@/app/actions/reservations";
import { RESOURCE_TYPES, type ResourceType } from "@/lib/config";
import { BookingModal, type BookingTarget } from "./BookingModal";

export interface GridResource {
  id: number;
  name: string;
  type: ResourceType;
  capacity: number;
}

export interface GridReservation {
  id: number;
  resourceId: number;
  startTime: string;
  endTime: string;
  userId: number;
  userName: string;
  purpose: string | null;
}

export function ReservationGrid({
  resources,
  reservations,
  slots,
  date,
  currentUserId,
  isAdmin,
}: {
  resources: GridResource[];
  reservations: GridReservation[];
  slots: string[];
  date: string;
  currentUserId: number;
  isAdmin: boolean;
}) {
  const [target, setTarget] = useState<BookingTarget | null>(null);
  const [, startTransition] = useTransition();

  const byResource = new Map<number, GridReservation[]>();
  for (const r of reservations) {
    const list = byResource.get(r.resourceId) ?? [];
    list.push(r);
    byResource.set(r.resourceId, list);
  }

  const slotSpan = (r: GridReservation) =>
    slots.filter((s) => s >= r.startTime && s < r.endTime).length;

  const handleCancel = (r: GridReservation) => {
    const who = r.userId === currentUserId ? "自分" : r.userName;
    if (!confirm(`${who}の予約（${r.startTime}〜${r.endTime}）を取り消しますか？`))
      return;
    const fd = new FormData();
    fd.set("id", String(r.id));
    startTransition(() => cancelReservation(fd));
  };

  const groups: ResourceType[] = ["booth", "room"];

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="border-collapse text-xs" style={{ minWidth: 900 }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-36 min-w-36 border-b border-r border-gray-200 bg-gray-50 px-2 py-2 text-left font-medium">
              設備
            </th>
            {slots.map((s) => (
              <th
                key={s}
                className="min-w-9 border-b border-r border-gray-100 bg-gray-50 px-0 py-1 text-center font-normal text-gray-500"
              >
                {s.endsWith(":00") ? s.slice(0, 2).replace(/^0/, "") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((type) => {
            const groupResources = resources.filter((r) => r.type === type);
            if (groupResources.length === 0) return null;
            return [
              <tr key={`g-${type}`}>
                <td
                  colSpan={slots.length + 1}
                  className="sticky left-0 border-b border-gray-200 bg-blue-50 px-2 py-1 font-medium text-blue-800"
                >
                  {RESOURCE_TYPES[type]}
                </td>
              </tr>,
              ...groupResources.map((res) => {
                const resReservations = (byResource.get(res.id) ?? []).sort(
                  (a, b) => (a.startTime < b.startTime ? -1 : 1),
                );
                const cells: React.ReactNode[] = [];
                let i = 0;
                while (i < slots.length) {
                  const slot = slots[i];
                  const hit = resReservations.find(
                    (r) => r.startTime <= slot && slot < r.endTime,
                  );
                  if (hit) {
                    const span = slotSpan(hit);
                    const own = hit.userId === currentUserId;
                    const canCancel = own || isAdmin;
                    cells.push(
                      <td
                        key={slot}
                        colSpan={span}
                        title={`${hit.userName}${hit.purpose ? `（${hit.purpose}）` : ""} ${hit.startTime}〜${hit.endTime}`}
                        onClick={canCancel ? () => handleCancel(hit) : undefined}
                        className={`overflow-hidden border-b border-r border-gray-100 px-1 py-2 text-center whitespace-nowrap ${
                          own
                            ? "cursor-pointer bg-blue-500 text-white hover:bg-blue-600"
                            : `bg-gray-300 text-gray-700 ${isAdmin ? "cursor-pointer hover:bg-gray-400" : ""}`
                        }`}
                      >
                        {hit.userName}
                      </td>,
                    );
                    i += span;
                  } else {
                    cells.push(
                      <td
                        key={slot}
                        onClick={() =>
                          setTarget({
                            resourceId: res.id,
                            resourceName: res.name,
                            date,
                            startTime: slot,
                            endTime: endOfSlot(slot),
                          })
                        }
                        className="cursor-pointer border-b border-r border-gray-100 py-2 hover:bg-green-100"
                      />,
                    );
                    i += 1;
                  }
                }
                return (
                  <tr key={res.id}>
                    <td className="sticky left-0 z-10 border-b border-r border-gray-200 bg-white px-2 py-2">
                      <div className="font-medium">{res.name}</div>
                      <div className="text-[10px] text-gray-400">
                        定員{res.capacity}名
                      </div>
                    </td>
                    {cells}
                  </tr>
                );
              }),
            ];
          })}
        </tbody>
      </table>
      {target && (
        <BookingModal
          target={target}
          slotTimes={slots}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}

function endOfSlot(start: string): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + 30;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
