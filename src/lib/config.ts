// 営業時間・予約スロットの設定
export const OPEN_TIME = "08:00";
export const CLOSE_TIME = "20:00";
export const SLOT_MINUTES = 30;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// 1日分のスロット開始時刻の一覧（"08:00", "08:30", ... "19:30"）
export function daySlots(): string[] {
  const slots: string[] = [];
  for (
    let t = timeToMinutes(OPEN_TIME);
    t < timeToMinutes(CLOSE_TIME);
    t += SLOT_MINUTES
  ) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

export const SLOTS_PER_DAY =
  (timeToMinutes(CLOSE_TIME) - timeToMinutes(OPEN_TIME)) / SLOT_MINUTES;

// Asia/Tokyo の今日の日付 "YYYY-MM-DD"
export function todayJst(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());
}

export const RESOURCE_TYPES = {
  booth: "テレワークブース",
  room: "会議室",
} as const;

export type ResourceType = keyof typeof RESOURCE_TYPES;
