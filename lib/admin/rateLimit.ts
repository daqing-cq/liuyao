import "server-only";

/**
 * AI 限流（§56 / §54-10）：内存实现（单实例）。
 * 单 IP 10 次/分钟、100 次/日。
 */
type Bucket = { minuteStart: number; minuteCount: number; dayStart: number; dayCount: number };

const g = globalThis as unknown as { __kylAiBuckets?: Map<string, Bucket> };

function buckets(): Map<string, Bucket> {
  return (g.__kylAiBuckets ??= new Map());
}

export function checkAiRate(ip: string): { ok: boolean; reason?: string } {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const b = buckets().get(ip) ?? { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };
  if (now - b.minuteStart > 60_000) {
    b.minuteStart = now;
    b.minuteCount = 0;
  }
  if (now - b.dayStart > dayMs) {
    b.dayStart = now;
    b.dayCount = 0;
  }
  b.minuteCount++;
  b.dayCount++;
  buckets().set(ip, b);
  if (b.minuteCount > 10) return { ok: false, reason: "请求过于频繁（10 次/分钟）" };
  if (b.dayCount > 100) return { ok: false, reason: "今日请求已达上限（100 次/日）" };
  return { ok: true };
}
