/**
 * 装卦核心（§9 / §11–§15 / §45–§47）
 *
 * 流程：画卦（本卦/变卦识别）→ 纳甲装地支天干 → 定六亲（本卦宫五行=我）→
 *       安世应（从 HexagramDefinition 读取，§11）→ 起六神（日干起点，自初向上，§15）。
 */
import type {
  Branch, ChartResult, Element, Line, Stem, TossResult,
  TimeContext, TrigramName, YinYang, SixRelative,
} from "../types.js";
import { ENGINE_VERSION, RULES_VERSION } from "../types.js";
import { TRIGRAMS } from "../data/trigrams.js";
import { hexagramByLines, type HexagramDefinition } from "../data/hexagrams.js";
import { NA_JIA_TABLE, sixGodStartIndex, SIX_GOD_ORDER } from "../data/naJiaTable.js";
import { BRANCH_ELEMENTS, sixRelativeOf } from "../data/branches.js";
import { yinYangFromBacks, flipped } from "./coin.js";

/** 由 tosses（index 1..6）得到自下而上阴阳序列（内部下标 0..5 = index-1，§89-K） */
export function linesFromTosses(tosses: TossResult[]): YinYang[] {
  if (tosses.length !== 6) throw new Error("tosses 必须为 6 爻");
  return tosses.map((t) => yinYangFromBacks(t.backs));
}

/** 变卦阴阳序列：动爻翻转 */
export function changedLines(tosses: TossResult[]): YinYang[] {
  return tosses.map((t) =>
    t.isMoving ? flipped(yinYangFromBacks(t.backs)) : yinYangFromBacks(t.backs)
  );
}

type LineInit = {
  position: 1 | 2 | 3 | 4 | 5 | 6;
  backs: 0 | 1 | 2 | 3;
  yinYang: YinYang;
  isMoving: boolean;
  stem: Stem;
  branch: Branch;
  element: Element;
  relative: SixRelative;
  sixGod: (typeof SIX_GOD_ORDER)[number];
  shiYing: null | "世" | "应";
};

/** 对一个给定六爻形态装卦（本卦或变卦均可用；变卦六亲仍按本卦宫，§14.1） */
function assembleLines(
  hex: HexagramDefinition,
  palaceElement: Element,
  dayStem: Stem,
  opts?: {
    backs?: Array<0 | 1 | 2 | 3>;
    isMoving?: boolean[];
  }
): Line[] {
  const inner = NA_JIA_TABLE[hex.lower];
  const outer = NA_JIA_TABLE[hex.upper];

  const out: Line[] = [];
  for (let i = 0; i < 6; i++) {
    const position = (i + 1) as 1 | 2 | 3 | 4 | 5 | 6;
    // 内卦三爻：初→三 取 innerBranches[0..2]；外卦三爻：四→上 取 outerBranches[0..2]
    const branch: Branch =
      i < 3 ? inner.innerBranches[i] : outer.outerBranches[i - 3];
    const stem: Stem = i < 3 ? inner.innerStem : outer.outerStem;
    const element = BRANCH_ELEMENTS[branch];
    // 六亲以本卦宫五行为"我"（§14）；变卦六亲同样以本卦宫五行（§14.1）
    const relative = sixRelativeOf(element, palaceElement);

    // 六神：日干定起点，自初爻向上依次排列（§15，禁止从上往下排）
    const startIdx = sixGodStartIndex(dayStem);
    const sixGod = SIX_GOD_ORDER[(startIdx + i) % 6];

    const shiYing =
      position === hex.shiPosition ? "世" :
      position === hex.yingPosition ? "应" : null;

    out.push({
      position,
      backs: opts?.backs ? opts.backs[i] : (hex.lines[i] === "yang" ? 1 : 2),
      yinYang: hex.lines[i],
      isMoving: opts?.isMoving ? opts.isMoving[i] : false,
      stem,
      branch,
      element,
      relative,
      sixGod,
      shiYing,
      monthStrength: "休", // 占位，由 strength 模块覆写
      dayEffect: "日平",
      isVoid: false,
      isMonthBroken: false,
      isHiddenMoving: false,
      isDayBroken: false,
      returnEffect: null,
    });
  }
  return out;
}

/** 变爻信息（§26 / §14.1）：变卦不重新排世应、六神；六亲以本卦宫五行为我 */
function attachChangedInfo(lines: Line[], changingHex: HexagramDefinition, palaceElement: Element): void {
  for (let i = 0; i < 6; i++) {
    const line = lines[i];
    if (!line) continue;
    if (!line.isMoving) continue;
    const cYinYang = flipped(line.yinYang);
    const cBranch: Branch =
      i < 3
        ? NA_JIA_TABLE[changingHex.lower].innerBranches[i]
        : NA_JIA_TABLE[changingHex.upper].outerBranches[i - 3];
    const cStem: Stem =
      i < 3
        ? NA_JIA_TABLE[changingHex.lower].innerStem
        : NA_JIA_TABLE[changingHex.upper].outerStem;
    const cElement = BRANCH_ELEMENTS[cBranch];
    const cRelative = sixRelativeOf(cElement, palaceElement); // 本卦宫五行=我

    line.changedYinYang = cYinYang;
    line.changedBranch = cBranch;
    line.changedElement = cElement;
    line.changedRelative = cRelative;

    // 回头作用：变爻对动爻自身（§26）
    const selfEl = line.element;
    if (cElement === selfEl) {
      line.returnEffect = "比和";
    } else if (
      (cElement === "水" && selfEl === "木") || (cElement === "木" && selfEl === "火") ||
      (cElement === "火" && selfEl === "土") || (cElement === "土" && selfEl === "金") ||
      (cElement === "金" && selfEl === "水")
    ) {
      line.returnEffect = "回头生";
    } else if (
      (cElement === "土" && selfEl === "水") || (cElement === "水" && selfEl === "火") ||
      (cElement === "火" && selfEl === "金") || (cElement === "金" && selfEl === "木") ||
      (cElement === "木" && selfEl === "土")
    ) {
      line.returnEffect = "回头克";
    }
  }
}

export type BuildChartOptions = {
  tosses: TossResult[];
  timeContext: TimeContext;
  generatedAt?: string;
};

/** 由 tosses + timeContext 装出完整卦盘（确定性：同输入字节级一致，§83-2） */
export function buildChart(opts: BuildChartOptions): ChartResult {
  const { tosses, timeContext } = opts;
  const linesYZ = linesFromTosses(tosses);
  const original = hexagramByLines(linesYZ);

  const isMovingArr = tosses.map((t) => t.isMoving);
  const backsArr = tosses.map((t) => t.backs) as Array<0 | 1 | 2 | 3>;
  const palaceElement = TRIGRAMS[original.palace].element;

  const lines = assembleLines(original, palaceElement, timeContext.dayStem, {
    backs: backsArr,
    isMoving: isMovingArr,
  });

  const result: ChartResult = {
    engineVersion: ENGINE_VERSION,
    rulesVersion: RULES_VERSION,
    generatedAt: opts.generatedAt ?? timeContext.timestamp,
    original: {
      name: original.name,
      palace: original.palace,
      palaceElement,
      upper: original.upper,
      lower: original.lower,
    },
    lines,
    shiPosition: original.shiPosition,
    yingPosition: original.yingPosition,
    timeContext,
    relations: [],
  };

  // 变卦（§45）：所有动爻翻转后的卦；完全无动爻则变卦为无
  const hasMoving = isMovingArr.some(Boolean);
  if (hasMoving) {
    const changed = hexagramByLines(changedLines(tosses));
    result.changing = {
      name: changed.name,
      upper: changed.upper,
      lower: changed.lower,
      lines: [],
    };
    // 变卦六爻信息（六亲以本卦宫五行，§14.1）
    for (let i = 0; i < 6; i++) {
      const branch: Branch =
        i < 3
          ? NA_JIA_TABLE[changed.lower].innerBranches[i]
          : NA_JIA_TABLE[changed.upper].outerBranches[i - 3];
      const element = BRANCH_ELEMENTS[branch];
      result.changing.lines.push({
        position: i + 1,
        branch,
        element,
        relative: sixRelativeOf(element, palaceElement),
      });
    }
    attachChangedInfo(lines, changed, palaceElement);
  }

  return result;
}

export { assembleLines };
