/**
 * 旺衰模块（§22 / §23 / §25）
 *
 * 月建旺衰（§22 正式表）：
 *   同五行=旺；月建所生=相；生月建=休；克月建=囚；被月建克=死。
 *   实现（§65-C）必须严格按"谁作用于谁"的方向：酉金克卯木 → 卯木被月建克 → 死。
 *
 * 日辰作用（§23）：
 *   日冲 > 日合 > 日生 > 日克 > 日扶 > 日平（优先级建议，含日扶/日比和 §65-H）。
 */
import type { Branch, DayEffect, Element, Line, TimeContext } from "../types.js";
import { BRANCH_ELEMENTS, isChong, isHe, ke, sheng } from "../data/branches.js";

export type MonthlyStrength = "旺" | "相" | "休" | "囚" | "死";

/** 月建相对某爻五行的旺衰判定（§22，§65-C 方向严格性） */
export function monthlyStrength(lineElement: Element, monthBranch: Branch): MonthlyStrength {
  const monthElement = BRANCH_ELEMENTS[monthBranch];
  if (lineElement === monthElement) return "旺";      // 同五行
  if (sheng(monthElement, lineElement)) return "相";  // 月建所生
  if (sheng(lineElement, monthElement)) return "休";  // 生月建
  if (ke(lineElement, monthElement)) return "囚";     // 克月建
  return "死";                                        // 被月建克（ke(monthElement, lineElement)）
}

/** 日辰作用判定（§23，含日扶 §65-H） */
export function dayEffectFor(lineBranch: Branch, lineElement: Element, dayBranch: Branch): DayEffect {
  if (isChong(dayBranch, lineBranch)) return "日冲";
  if (isHe(dayBranch, lineBranch)) return "日合";
  const dayElement = BRANCH_ELEMENTS[dayBranch];
  if (sheng(dayElement, lineElement)) return "日生";
  if (ke(dayElement, lineElement)) return "日克";
  if (dayElement === lineElement) return "日扶"; // 日扶/日比和
  return "日平";
}

/**
 * 暗动 / 日破判定（§25 修正版 + §89-Q）：
 *   暗动：旺相静爻逢日冲，且非旬空、非月破。
 *   日破/冲散倾向：休囚死静爻逢日冲，且非旬空、非月破。
 *   旬空静爻逢日冲：标记"空而被冲，待确认"，不判暗动（§79-22）。
 *   月破静爻逢日冲：标记"月破日冲，难断"。
 */
export function applyHiddenMoving(lines: Line[], tc: TimeContext): void {
  for (const line of lines) {
    const dayClash = line.branch === tc.dayBranch ? false : isChong(tc.dayBranch, line.branch);
    if (!line.isMoving && dayClash) {
      const strong = line.monthStrength === "旺" || line.monthStrength === "相";
      const weak = line.monthStrength === "休" || line.monthStrength === "囚" || line.monthStrength === "死";
      if (line.isVoid && !line.isMonthBroken) {
        line.specialMark = "空而被冲，待确认";
      } else if (line.isMonthBroken) {
        line.specialMark = "月破日冲，难断";
      } else if (strong) {
        line.isHiddenMoving = true;
      } else if (weak) {
        line.isDayBroken = true;
      }
    }
  }
}

/** 为所有爻计算并写入 monthStrength / dayEffect（须在 isVoid/isMonthBroken 判定之后、暗动之前调用旺衰部分） */
export function applyStrengthAndDayEffect(lines: Line[], tc: TimeContext): void {
  for (const line of lines) {
    line.monthStrength = monthlyStrength(line.element, tc.monthBranch);
    line.dayEffect = dayEffectFor(line.branch, line.element, tc.dayBranch);
  }
}
