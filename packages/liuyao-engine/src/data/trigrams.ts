/**
 * 八卦基础数据（§10）
 * lines 自下而上（bottom -> top），index 0 = 初位。
 */
import type { Element, TrigramName, YinYang } from "../types.js";

export type TrigramCode = {
  name: TrigramName;
  lines: [YinYang, YinYang, YinYang];
  element: Element;
};

export const TRIGRAMS: Record<TrigramName, TrigramCode> = {
  乾: { name: "乾", lines: ["yang", "yang", "yang"], element: "金" },
  兑: { name: "兑", lines: ["yang", "yang", "yin"], element: "金" },
  离: { name: "离", lines: ["yang", "yin", "yang"], element: "火" },
  震: { name: "震", lines: ["yang", "yin", "yin"], element: "木" },
  巽: { name: "巽", lines: ["yin", "yang", "yang"], element: "木" },
  坎: { name: "坎", lines: ["yin", "yang", "yin"], element: "水" },
  艮: { name: "艮", lines: ["yin", "yin", "yang"], element: "土" },
  坤: { name: "坤", lines: ["yin", "yin", "yin"], element: "土" },
};

export const TRIGRAM_NAMES: TrigramName[] = [
  "乾", "兑", "离", "震", "巽", "坎", "艮", "坤",
];

export const PALACE_ELEMENTS: Record<TrigramName, Element> = {
  乾: "金", 兑: "金", 离: "火", 震: "木", 巽: "木", 坎: "水", 艮: "土", 坤: "土",
};

/** 由三爻阴阳序列（bottom->top）反查卦名 */
export function trigramByLines(lines: YinYang[]): TrigramName {
  for (const name of TRIGRAM_NAMES) {
    const t = TRIGRAMS[name];
    if (
      t.lines[0] === lines[0] &&
      t.lines[1] === lines[1] &&
      t.lines[2] === lines[2]
    ) {
      return name;
    }
  }
  throw new Error(`未知三爻形态: ${lines.join(",")}`);
}
