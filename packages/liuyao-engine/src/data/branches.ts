/**
 * 基础数据表：天干、地支、五行（§10、§14、§19）
 * 数据驱动（§67），关系表集中于此。
 */
import type { Branch, Element, Stem } from "../types.js";

export const STEMS: Stem[] = [
  "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸",
];

export const BRANCHES: Branch[] = [
  "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
];

/** 甲子 → 癸亥 六十甲子（index 0 = 甲子） */
export const GAN_ZHI_60: string[] = (() => {
  const out: string[] = [];
  for (let i = 0; i < 60; i++) {
    out.push(`${STEMS[i % 10]}${BRANCHES[i % 12]}`);
  }
  return out;
})();

export const STEM_ELEMENTS: Record<Stem, Element> = {
  甲: "木", 乙: "木",
  丙: "火", 丁: "火",
  戊: "土", 己: "土",
  庚: "金", 辛: "金",
  壬: "水", 癸: "水",
};

export const BRANCH_ELEMENTS: Record<Branch, Element> = {
  寅: "木", 卯: "木",
  巳: "火", 午: "火",
  辰: "土", 戌: "土", 丑: "土", 未: "土",
  申: "金", 酉: "金",
  亥: "水", 子: "水",
};

/** 五行相生：木→火→土→金→水→木 */
const SHENG_PAIRS: Record<Element, Element> = {
  木: "火", 火: "土", 土: "金", 金: "水", 水: "木",
};

/** 五行相克（§65-A 正式相克关系表，机器规则以此为准）：
 * 木克土、土克水、水克火、火克金、金克木 */
const KE_PAIRS: Record<Element, Element> = {
  木: "土", 土: "水", 水: "火", 火: "金", 金: "木",
};

/** a 生 b */
export function sheng(a: Element, b: Element): boolean {
  return SHENG_PAIRS[a] === b;
}

/** a 克 b */
export function ke(a: Element, b: Element): boolean {
  return KE_PAIRS[a] === b;
}

/** a 对 b 的六亲称呼（以 b 为"我"）：生我=父母，同我=兄弟，我生=子孙，我克=妻财，克我=官鬼（§14） */
export function sixRelativeOf(a: Element, b: Element) {
  if (a === b) return "兄弟" as const;
  if (SHENG_PAIRS[a] === b) return "父母" as const;   // a 生 b：生我者
  if (SHENG_PAIRS[b] === a) return "子孙" as const;   // b 生 a：我生者
  if (KE_PAIRS[a] === b) return "官鬼" as const;      // a 克 b：克我者
  if (KE_PAIRS[b] === a) return "妻财" as const;      // b 克 a：我克者
  throw new Error(`五行关系异常: ${a}/${b}`);
}

/** 六冲（§19.1） */
const CHONG_PAIRS: Array<[Branch, Branch]> = [
  ["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"],
];

/** 六合（§19.2） */
const HE_PAIRS: Array<[Branch, Branch]> = [
  ["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"],
];

/** 三合（§19.3，第一版仅识别，不断合化） */
export const SANHE_GROUPS: Branch[][] = [
  ["申", "子", "辰"],
  ["亥", "卯", "未"],
  ["寅", "午", "戌"],
  ["巳", "酉", "丑"],
];

/** 三刑（common_modern，仅识别不参与结论 §19/§66） */
export const SANXING_GROUPS: Array<[Branch, Branch, Branch?]> = [
  ["寅", "巳", "申"],
  ["丑", "戌", "未"],
  ["子", "卯"],
  ["辰", "辰"],
  ["午", "午"],
  ["酉", "酉"],
  ["亥", "亥"],
];

/** 六害（common_modern，仅识别） */
const HAI_PAIRS: Array<[Branch, Branch]> = [
  ["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"],
];

function pairMatch(pairs: Array<[Branch, Branch]>, a: Branch, b: Branch): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export function isChong(a: Branch, b: Branch): boolean {
  return pairMatch(CHONG_PAIRS, a, b);
}

export function isHe(a: Branch, b: Branch): boolean {
  return pairMatch(HE_PAIRS, a, b);
}

export function isHai(a: Branch, b: Branch): boolean {
  return pairMatch(HAI_PAIRS, a, b);
}

/** 与给定地支相冲的地支 */
export function chongOf(b: Branch): Branch {
  const found = CHONG_PAIRS.find(([x, y]) => x === b || y === b);
  if (!found) throw new Error(`六冲表缺少 ${b}`);
  return found[0] === b ? found[1] : found[0];
}
