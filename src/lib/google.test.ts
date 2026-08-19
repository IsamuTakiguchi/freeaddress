import { describe, expect, it } from "vitest";
import { buildEventPayload } from "./google";

describe("buildEventPayload", () => {
  it("予約内容からカレンダーイベントを組み立てる", () => {
    const payload = buildEventPayload({
      resourceName: "会議室Ａ",
      date: "2026-08-20",
      startTime: "10:00",
      endTime: "11:30",
      purpose: "○○案件の打合せ",
    });
    expect(payload.summary).toBe("【予約】会議室Ａ");
    expect(payload.location).toBe("会議室Ａ");
    expect(payload.description).toContain("○○案件の打合せ");
    expect(payload.start).toEqual({
      dateTime: "2026-08-20T10:00:00",
      timeZone: "Asia/Tokyo",
    });
    expect(payload.end).toEqual({
      dateTime: "2026-08-20T11:30:00",
      timeZone: "Asia/Tokyo",
    });
  });

  it("利用目的なしでも組み立てられる", () => {
    const payload = buildEventPayload({
      resourceName: "テレワークブース１",
      date: "2026-08-20",
      startTime: "09:00",
      endTime: "09:30",
      purpose: null,
    });
    expect(payload.description).toContain("自動登録");
  });
});
