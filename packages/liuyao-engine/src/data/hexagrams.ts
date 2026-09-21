/**
 * 六十四卦静态表（§11 / §83-3）
 *
 * 按 §83-3 要求：由八宫变爻算法生成（纯卦 → 初爻变一世 → … → 五世 →
 * 四爻变游魂 → 内卦复归归魂），卦名表与人工核对 fixture 比对，禁止纯手抄无校验。
 * 回归测试（tests/）校验：id 唯一、每宫恰好 8 卦、世应分布与八宫正式表一致（§63）。
 */
import type { PalaceName, TrigramName, YinYang } from "../types.js";
import { TRIGRAMS, trigramByLines } from "./trigrams.js";

export type GenerationType =
  | "pure"
  | "first"
  | "second"
  | "third"
  | "fourth"
  | "fifth"
  | "wandering"
  | "returning";

export type HexagramDefinition = {
  id: string;
  name: string;
  upper: TrigramName;
  lower: TrigramName;
  /** 自下而上六爻阴阳，index 0 = 初爻 */
  lines: YinYang[];
  palace: PalaceName;
  palaceElement: string;
  generationType: GenerationType;
  shiPosition: 1 | 2 | 3 | 4 | 5 | 6;
  yingPosition: 1 | 2 | 3 | 4 | 5 | 6;
};

/** 八宫顺序（京房八宫次序） */
export const PALACE_ORDER: PalaceName[] = [
  "乾", "坎", "艮", "震", "巽", "离", "坤", "兑",
];

/** 八宫世应正式表（§11） */
export const SHI_YING_TABLE: Record<
  GenerationType,
  { shi: 1 | 2 | 3 | 4 | 5 | 6; ying: 1 | 2 | 3 | 4 | 5 | 6 }
> = {
  pure: { shi: 6, ying: 3 },
  first: { shi: 1, ying: 4 },
  second: { shi: 2, ying: 5 },
  third: { shi: 3, ying: 6 },
  fourth: { shi: 4, ying: 1 },
  fifth: { shi: 5, ying: 2 },
  wandering: { shi: 4, ying: 1 },
  returning: { shi: 3, ying: 6 },
};

/**
 * 六十四卦名称表（键 = 六爻阴阳自下而上，1 = 阳、0 = 阴）。
 * 已逐宫按八宫变爻次序人工核对；测试同时用"上下卦组合查名"二次校验。
 */
const HEXAGRAM_NAMES: Record<string, string> = {
  // 乾宫
  "111111": "乾为天", "011111": "天风姤", "001111": "天山遁", "000111": "天地否",
  "000011": "风地观", "000001": "山地剥", "000101": "火地晋", "111101": "火天大有",
  // 坎宫
  "010010": "坎为水", "110010": "水泽节", "100010": "水雷屯", "101010": "水火既济",
  "101110": "泽火革", "101100": "雷火丰", "101000": "地火明夷", "010000": "地水师",
  // 艮宫
  "001001": "艮为山", "101001": "山火贲", "111001": "山天大畜", "110001": "山泽损",
  "110101": "火泽睽", "110111": "天泽履", "110011": "风泽中孚", "001011": "风山渐",
  // 震宫
  "100100": "震为雷", "000100": "雷地豫", "010100": "雷水解", "011100": "雷风恒",
  "011000": "地风升", "011010": "水风井", "011110": "泽风大过", "100110": "泽雷随",
  // 巽宫
  "011011": "巽为风", "111011": "风天小畜", "101011": "风火家人", "100011": "风雷益",
  "100111": "天雷无妄", "100101": "火雷噬嗑", "100001": "山雷颐", "011001": "山风蛊",
  // 离宫
  "101101": "离为火", "001101": "火山旅", "011101": "火风鼎", "010101": "火水未济",
  "010001": "山水蒙", "010011": "风水涣", "010111": "天水讼", "101111": "天火同人",
  // 坤宫
  "000000": "坤为地", "100000": "地雷复", "110000": "地泽临", "111000": "地天泰",
  "111100": "雷天大壮", "111110": "泽天夬", "111010": "水天需", "000010": "水地比",
  // 兑宫
  "110110": "兑为泽", "010110": "泽水困", "000110": "泽地萃", "001110": "泽山咸",
  "001010": "水山蹇", "001000": "地山谦", "001100": "雷山小过", "110100": "雷泽归妹",
};

const flipAt = (lines: YinYang[], pos: number): YinYang[] =>
  lines.map((l, i) => (i === pos - 1 ? (l === "yang" ? "yin" : "yang") : l));

/** 六爻阴阳序列 -> 1/0 键（yang=1、yin=0，自下而上），与 HEXAGRAM_NAMES 键一致 */
const linesKey = (lines: YinYang[]): string =>
  lines.map((l) => (l === "yang" ? "1" : "0")).join("");

/** 由本宫纯卦生成一宫八卦（京房八宫变爻次序） */
function buildPalace(palace: PalaceName): HexagramDefinition[] {
  const trigramLines = TRIGRAMS[palace].lines;
  // 纯卦六爻 = 本宫三爻上下相重（下卦 = 上卦 = 本宫经卦）
  const pureLines = [...trigramLines, ...trigramLines] as YinYang[];

  const gens: Array<{ type: GenerationType; pos: number | null }> = [
    { type: "pure", pos: null },
    { type: "first", pos: 1 },
    { type: "second", pos: 2 },
    { type: "third", pos: 3 },
    { type: "fourth", pos: 4 },
    { type: "fifth", pos: 5 },
    // 游魂：在五世基础上四爻再变
    { type: "wandering", pos: 4 },
    // 归魂：内卦（初二三爻）复归本宫纯卦内卦
    { type: "returning", pos: null },
  ];

  const out: HexagramDefinition[] = [];
  let cur = [...pureLines] as YinYang[];

  for (const g of gens) {
    if (g.type === "wandering") {
      cur = flipAt(cur, 4);
    } else if (g.type === "returning") {
      cur = [pureLines[0], pureLines[1], pureLines[2], cur[3], cur[4], cur[5]];
    } else if (g.pos !== null) {
      cur = flipAt(cur, g.pos);
    }

    const key = linesKey(cur);
    const name = HEXAGRAM_NAMES[key];
    if (!name) {
      throw new Error(`八宫生成缺卦名: palace=${palace} key=${key} type=${g.type}`);
    }

    const lower = trigramByLines([cur[0], cur[1], cur[2]]);
    const upper = trigramByLines([cur[3], cur[4], cur[5]]);
    const sy = SHI_YING_TABLE[g.type];

    out.push({
      id: `${palace}-${g.type}`,
      name,
      upper,
      lower,
      lines: [...cur],
      palace,
      palaceElement: TRIGRAMS[palace].element,
      generationType: g.type,
      shiPosition: sy.shi,
      yingPosition: sy.ying,
    });
  }

  return out;
}

/** 完整 64 卦表（按宫生成，顺序稳定；同输入字节级确定） */
export const HEXAGRAMS: HexagramDefinition[] = (() => {
  const all: HexagramDefinition[] = [];
  for (const p of PALACE_ORDER) {
    all.push(...buildPalace(p));
  }
  return all;
})();

/** 由六爻阴阳序列（bottom->top）查找卦定义 */
export function hexagramByLines(lines: YinYang[]): HexagramDefinition {
  const key = lines.join("");
  const found = HEXAGRAMS.find((h) => h.lines.join("") === key);
  if (!found) throw new Error(`未知六爻形态: ${key}`);
  return found;
}

export function hexagramByName(name: string): HexagramDefinition {
  const found = HEXAGRAMS.find((h) => h.name === name);
  if (!found) throw new Error(`未知卦名: ${name}`);
  return found;
}
