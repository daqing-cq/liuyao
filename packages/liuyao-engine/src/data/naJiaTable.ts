/**
 * 京房纳甲 / 纳支正式表（§12、§13）
 *
 * 每组三支自下而上。内卦用于下三爻（初→三），外卦用于上三爻（四→上）。
 * 天干：乾内甲外壬、坤内乙外癸，其余内外同干（§65-F）。
 */
import type { Branch, Stem, TrigramName } from "../types.js";

export type NaJiaEntry = {
  innerBranches: [Branch, Branch, Branch]; // 内卦 初→三
  outerBranches: [Branch, Branch, Branch]; // 外卦 四→上
  innerStem: Stem;
  outerStem: Stem;
};

export const NA_JIA_TABLE: Record<TrigramName, NaJiaEntry> = {
  乾: {
    innerBranches: ["子", "寅", "辰"],
    outerBranches: ["午", "申", "戌"],
    innerStem: "甲",
    outerStem: "壬",
  },
  震: {
    innerBranches: ["子", "寅", "辰"],
    outerBranches: ["午", "申", "戌"],
    innerStem: "庚",
    outerStem: "庚",
  },
  坎: {
    innerBranches: ["寅", "辰", "午"],
    outerBranches: ["申", "戌", "子"],
    innerStem: "戊",
    outerStem: "戊",
  },
  艮: {
    innerBranches: ["辰", "午", "申"],
    outerBranches: ["戌", "子", "寅"],
    innerStem: "丙",
    outerStem: "丙",
  },
  坤: {
    innerBranches: ["未", "巳", "卯"],
    outerBranches: ["丑", "亥", "酉"],
    innerStem: "乙",
    outerStem: "癸",
  },
  巽: {
    innerBranches: ["丑", "亥", "酉"],
    outerBranches: ["未", "巳", "卯"],
    innerStem: "辛",
    outerStem: "辛",
  },
  离: {
    innerBranches: ["卯", "丑", "亥"],
    outerBranches: ["酉", "未", "巳"],
    innerStem: "己",
    outerStem: "己",
  },
  兑: {
    innerBranches: ["巳", "卯", "丑"],
    outerBranches: ["亥", "酉", "未"],
    innerStem: "丁",
    outerStem: "丁",
  },
};

/** 六神固定顺序（§15），自初爻向上依次排列，绝对禁止从上往下排 */
export const SIX_GOD_ORDER = [
  "青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武",
] as const;

/**
 * 六神起点（§15 / §89-L：以起卦日日柱天干为依据）
 * 甲乙 → 初爻青龙；丙丁 → 初爻朱雀；戊 → 初爻勾陈；
 * 己 → 初爻螣蛇；庚辛 → 初爻白虎；壬癸 → 初爻玄武。
 */
export function sixGodStartIndex(dayStem: Stem): number {
  switch (dayStem) {
    case "甲":
    case "乙":
      return 0; // 青龙
    case "丙":
    case "丁":
      return 1; // 朱雀
    case "戊":
      return 2; // 勾陈
    case "己":
      return 3; // 螣蛇
    case "庚":
    case "辛":
      return 4; // 白虎
    case "壬":
    case "癸":
      return 5; // 玄武
  }
}
