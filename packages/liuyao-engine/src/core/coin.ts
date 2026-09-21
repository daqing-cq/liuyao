/**
 * 掷币核心（§5.3 / §6 / §84）
 *
 * 随机性规范：
 *   - 唯一随机源 crypto.getRandomValues()；禁止 Math.random() / 时间种子 / 种子复用。
 *   - 每枚硬币独立取 1 bit（位运算），禁止 % 取模（modulo bias，§79-21）。
 *   - 每爻 3 bit 独立生成，六爻共 18 bit，逐爻消费，不得一次性生成后跨爻复用。
 */
import type { TossResult, LineType } from "../types.js";

export type CoinFace = "front" | "back";

/**
 * 结果生成（§6 正式映射）：
 *   0 背 = 三字面 / 老阴 oldYin / 动
 *   1 背 = 一背   / 少阳 youngYang / 静
 *   2 背 = 二背   / 少阴 youngYin / 静
 *   3 背 = 三背   / 老阳 oldYang / 动
 */
export function lineTypeFromBacks(backs: 0 | 1 | 2 | 3): LineType {
  switch (backs) {
    case 0: return "oldYin";
    case 1: return "youngYang";
    case 2: return "youngYin";
    case 3: return "oldYang";
  }
}

export function isMovingByBacks(backs: 0 | 1 | 2 | 3): boolean {
  return backs === 0 || backs === 3;
}

/**
 * 浏览器端掷币：每爻独立生成 3 个 bit（每枚硬币 1 bit，位运算取 bit，无取模）。
 * 抛出时调用方须提供 crypto.getRandomValues（浏览器与 Node ≥19 全局均有）。
 */
export function tossOneLine(randomBytes: Uint8Array, index: 1 | 2 | 3 | 4 | 5 | 6): TossResult {
  if (randomBytes.length < 3) {
    throw new Error("tossOneLine 需要 3 字节随机缓冲");
  }
  const coins: CoinFace[] = [];
  for (let i = 0; i < 3; i++) {
    const b = randomBytes[i];
    if (b === undefined) throw new Error("随机缓冲越界");
    coins.push((b & 1) === 1 ? "back" : "front");
  }
  const backs = coins.filter((c) => c === "back").length as 0 | 1 | 2 | 3;
  return {
    index,
    backs,
    coins,
    lineType: lineTypeFromBacks(backs),
    isMoving: isMovingByBacks(backs),
  };
}

/** 浏览器入口：生成一次完整的六爻 tosses（逐爻消费随机字节，§84-3） */
export function generateTosses(
  fillRandom: (buf: Uint8Array) => void
): TossResult[] {
  const out: TossResult[] = [];
  for (let idx = 1; idx <= 6; idx++) {
    const buf = new Uint8Array(3);
    fillRandom(buf);
    out.push(tossOneLine(buf, idx as 1 | 2 | 3 | 4 | 5 | 6));
  }
  return out;
}

/** 变爻翻转（§6）：老阳 O → 阴；老阴 X → 阳 */
export function flipped(yinYang: "yin" | "yang"): "yin" | "yang" {
  return yinYang === "yang" ? "yin" : "yang";
}

/** 由 backs 得到阴阳 */
export function yinYangFromBacks(backs: 0 | 1 | 2 | 3): "yin" | "yang" {
  // 1 背少阳=阳；2 背少阴=阴；3 背老阳=阳；0 背老阴=阴
  return backs === 1 || backs === 3 ? "yang" : "yin";
}
