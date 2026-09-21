/** 测试辅助：由 backs 数组构造 tosses（§7 结构） */
import type { TossResult } from "liuyao-engine";

export function tossesFromBacks(backs: Array<0 | 1 | 2 | 3>): TossResult[] {
  if (backs.length !== 6) throw new Error("backs 必须为 6 个");
  return backs.map((b, i) => {
    const coins: Array<"front" | "back"> =
      b === 0 ? ["front", "front", "front"]
      : b === 1 ? ["back", "front", "front"]
      : b === 2 ? ["back", "back", "front"]
      : ["back", "back", "back"];
    return {
      index: (i + 1) as 1 | 2 | 3 | 4 | 5 | 6,
      backs: b,
      coins,
      lineType:
        b === 0 ? "oldYin" : b === 1 ? "youngYang" : b === 2 ? "youngYin" : "oldYang",
      isMoving: b === 0 || b === 3,
    } satisfies TossResult;
  });
}
