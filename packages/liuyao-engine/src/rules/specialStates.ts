/**
 * 特殊状态：旬空（§17）、月破（§18）、地支关系（§19 / §28）
 */
import type { Branch, BranchRelation, Line, TimeContext } from "../types.js";
import { isChong, isHai, isHe, SANHE_GROUPS, SANXING_GROUPS } from "../data/branches.js";

/** 旬空判定（§17）：日柱所在旬的空亡二支 */
export function voidBranchesFor(dayGanZhiIdx: number): [Branch, Branch] {
  const start = dayGanZhiIdx - (dayGanZhiIdx % 10);
  const branchIdx = start % 12;
  // 甲子(0)→戌亥；甲戌(10)→申酉；甲申(20)→午未；甲午(30)→辰巳；甲辰(40)→寅卯；甲寅(50)→子丑
  const table: Record<number, [Branch, Branch]> = {
    0: ["戌", "亥"],
    10: ["申", "酉"],
    20: ["午", "未"],
    30: ["辰", "巳"],
    40: ["寅", "卯"],
    50: ["子", "丑"],
  };
  const v = table[branchIdx];
  if (!v) throw new Error(`旬空表异常: idx=${dayGanZhiIdx}`);
  return [v[0], v[1]];
}

export function applyVoidAndMonthBroken(lines: Line[], tc: TimeContext): void {
  for (const line of lines) {
    line.isVoid = tc.voidBranches.includes(line.branch);
    line.isMonthBroken = tc.monthBrokenBranches.includes(line.branch);
  }
}

/**
 * 地支关系识别（§19 / §28）。
 * 三刑 / 六害为 common_modern：第一版仅识别，不直接参与自动吉凶结论（§66）。
 * 三合仅识别组合，不自动断合化成功（§65-I）。
 */
export function findBranchRelations(lines: Line[]): BranchRelation[] {
  const out: BranchRelation[] = [];
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i];
    if (!a) continue;
    for (let j = i + 1; j < lines.length; j++) {
      const b = lines[j];
      if (!b) continue;
      if (isChong(a.branch, b.branch)) {
        out.push({ sourceLine: a.position, targetLine: b.position, relation: "冲" });
      }
      if (isHe(a.branch, b.branch)) {
        out.push({ sourceLine: a.position, targetLine: b.position, relation: "合" });
      }
      if (isHai(a.branch, b.branch)) {
        out.push({ sourceLine: a.position, targetLine: b.position, relation: "六害" });
      }
      // 三刑
      for (const group of SANXING_GROUPS) {
        const branches = group.filter(Boolean) as Branch[];
        if (branches.includes(a.branch) && branches.includes(b.branch) && a.branch !== b.branch) {
          out.push({ sourceLine: a.position, targetLine: b.position, relation: "三刑" });
        }
      }
    }
  }
  // 三合：全部三支均在卦中出现
  for (const group of SANHE_GROUPS) {
    const positions: number[] = [];
    for (const gb of group) {
      const line = lines.find((l) => l.branch === gb);
      if (line) positions.push(line.position);
    }
    if (positions.length === 3) {
      out.push({ sourceLine: positions[0] as number, targetLine: positions[positions.length - 1] as number, relation: "三合" });
    }
  }
  // 自刑（辰辰 午午 酉酉 亥亥）
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i];
    const b = lines[i + 1];
    if (a && b && a.branch === b.branch && ["辰", "午", "酉", "亥"].includes(a.branch)) {
      out.push({ sourceLine: a.position, targetLine: b.position, relation: "三刑" });
    }
  }
  return out;
}
