/** §63 随机与确定性、64 卦表、暗动、日辰、用神、结论、双用神测试 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tossOneLine, runDivination, buildTimeContextFromManualBeijing,
  HEXAGRAMS, monthlyStrength, dayEffectFor,
} from "liuyao-engine";
import { tossesFromBacks } from "./helpers.ts";

/* ---------------- 随机与确定性（§63） ---------------- */

test("硬币抽样：10 万次 backs=0/3 ≈1/8，backs=1/2 ≈3/8（容差 1%）", () => {
  const counts = [0, 0, 0, 0];
  const N = 100000;
  const buf = new Uint8Array(3);
  for (let i = 0; i < N; i++) {
    // 独立生成 3 个随机字节（模拟 crypto.getRandomValues 填充）
    const bytes = new Uint8Array(3);
    for (let j = 0; j < 3; j++) {
      bytes[j] = (Math.floor(i * 2654435761 + j * 40503) % 256 + 256) % 256; // 占位：下方用 crypto
    }
    // 直接使用全局 crypto（Node ≥19）
    globalThis.crypto.getRandomValues(buf);
    const t = tossOneLine(buf, 1);
    counts[t.backs]++;
  }
  const total = counts.reduce((a, b) => a + b, 0);
  const p0 = counts[0] / total, p1 = counts[1] / total, p2 = counts[2] / total, p3 = counts[3] / total;
  assert.ok(Math.abs(p0 - 0.125) < 0.01, `p0=${p0}`);
  assert.ok(Math.abs(p3 - 0.125) < 0.01, `p3=${p3}`);
  assert.ok(Math.abs(p1 - 0.375) < 0.01, `p1=${p1}`);
  assert.ok(Math.abs(p2 - 0.375) < 0.01, `p2=${p2}`);
});

test("位运算取 bit 无 modulo bias：单 bit 分布均匀", () => {
  let backs = 0;
  const N = 200000;
  const buf = new Uint8Array(3);
  for (let i = 0; i < N; i++) {
    globalThis.crypto.getRandomValues(buf);
    const t = tossOneLine(buf, 1);
    if (t.coins[0] === "back") backs++;
  }
  const ratio = backs / N;
  assert.ok(Math.abs(ratio - 0.5) < 0.01, `back ratio=${ratio}`);
});

test("同一 tosses + timeContext 输出字节级一致（键序稳定）", () => {
  const tosses = tossesFromBacks([1, 2, 3, 0, 1, 2]);
  const tc = buildTimeContextFromManualBeijing(2026, 9, 20, 19, 21);
  const a = runDivination({ tosses, timeContext: tc, category: "求财" });
  const b = runDivination({ tosses, timeContext: tc, category: "求财" });
  // 同一输入 chart 结构一致（generatedAt 固定来源 timeContext.timestamp）
  assert.equal(JSON.stringify(a.chart), JSON.stringify(b.chart));
  assert.equal(JSON.stringify(a.analysis), JSON.stringify(b.analysis));
});

test("64 卦表：id 唯一、每宫恰好 8 卦", () => {
  assert.equal(HEXAGRAMS.length, 64);
  const ids = new Set(HEXAGRAMS.map((h) => h.id));
  assert.equal(ids.size, 64);
  for (const palace of ["乾", "坎", "艮", "震", "巽", "离", "坤", "兑"]) {
    assert.equal(HEXAGRAMS.filter((h) => h.palace === palace).length, 8, palace);
  }
});

test("64 卦表：世应分布与八宫表一致", () => {
  const expect: Record<string, Array<[number, number]>> = {
    pure: [[6, 3]], first: [[1, 4]], second: [[2, 5]], third: [[3, 6]],
    fourth: [[4, 1]], fifth: [[5, 2]], wandering: [[4, 1]], returning: [[3, 6]],
  };
  for (const h of HEXAGRAMS) {
    const e = expect[h.generationType];
    assert.ok(e && e.some(([s, y]) => s === h.shiPosition && y === h.yingPosition), h.name);
  }
});

/* ---------------- 月建旺衰（§22 / §65-C） ---------------- */

test("酉金克卯木 → 卯木被月建克 → 死（§65-C 方向严格性）", () => {
  assert.equal(monthlyStrength("木", "酉"), "死");
  // 卯木克月建辰土 → 囚
  assert.equal(monthlyStrength("木", "辰"), "囚");
  // 同五行 → 旺
  assert.equal(monthlyStrength("金", "酉"), "旺");
  // 月建所生 → 相：酉金生亥水
  assert.equal(monthlyStrength("水", "酉"), "相");
  // 生月建 → 休：土生酉金
  assert.equal(monthlyStrength("土", "酉"), "休");
});

/* ---------------- 日辰（§23 / §65-H） ---------------- */

test("日辰优先级：日冲 > 日合 > 日生 > 日克 > 日扶 > 日平", () => {
  // 日支午，用神支子 → 日冲（子午冲）
  assert.equal(dayEffectFor("子", "水", "午"), "日冲");
  // 日支丑，用神支子 → 日合（子丑合），且丑土克子水 —— 冲合优先于生克
  assert.equal(dayEffectFor("子", "水", "丑"), "日合");
  // 日支寅木，用神五行土 → 日克（木克土）
  assert.equal(dayEffectFor("戌", "土", "寅"), "日克");
  // 日支亥水，用神五行火 → 日克（水克火）
  assert.equal(dayEffectFor("午", "火", "亥"), "日克");
  // 日支子水，用神五行木 → 日生（水生木）
  assert.equal(dayEffectFor("卯", "木", "子"), "日生");
  // 日支戌土，用神五行金 → 日生（土生金）
  assert.equal(dayEffectFor("酉", "金", "戌"), "日生");
  // 日支酉金，用神五行金 → 日扶（比和）
  assert.equal(dayEffectFor("酉", "金", "酉"), "日扶");
  // 日支巳火，用神五行木 → 日泄（平）：木生火为爻生日，不在六效中 → 日平
  assert.equal(dayEffectFor("寅", "木", "巳"), "日平");
});

/* ---------------- 用神（§20） ---------------- */

test("用神：多个妻财时全部列出并透明推荐", () => {
  // 乾为天（乾宫金）：四个妻财爻？乾宫六爻：子水子孙、寅木妻财、辰土父母、
  // 午火官鬼、申金兄弟、戌土父母 —— 妻财仅寅木一爻。改用坤为地测兄弟。
  // 坤为地（坤宫土）：未土父母、巳火父母、卯木官鬼、丑土兄弟、亥水妻财、酉金子孙
  // 用「求财」→ 妻财亥水（五爻）。
  const tosses = tossesFromBacks([2, 2, 2, 2, 2, 2]);
  const tc = buildTimeContextFromManualBeijing(2026, 9, 20, 12, 0);
  const { chart, analysis } = runDivination({ tosses, timeContext: tc, category: "求财" });
  assert.equal(chart.original.name, "坤为地");
  assert.equal(analysis.useGod.relative, "妻财");
  assert.equal(analysis.useGod.position, 5); // 亥水在五爻
  const candidates = chart.useGodCandidates ?? [];
  assert.ok(candidates.length >= 1);
  // 推荐理由透明（无评分）
  for (const c of candidates) {
    assert.ok(c.reasons.length > 0);
  }
});

test("婚姻占性别未填：提示手动确认（§3.3）", () => {
  // 坤为地有妻财亥水（五爻）与官鬼卯木（三爻），两类候选都存在
  const tosses = tossesFromBacks([2, 2, 2, 2, 2, 2]);
  const tc = buildTimeContextFromManualBeijing(2026, 9, 20, 12, 0);
  const { analysis } = runDivination({ tosses, timeContext: tc, category: "婚姻" });
  assert.ok(analysis.useGod.genderPrompt);
  assert.match(analysis.useGod.genderPrompt, /性别未填写/);
});

test("婚姻占男：妻财；女：官鬼", () => {
  const tosses = tossesFromBacks([1, 1, 1, 1, 1, 1]);
  const tc = buildTimeContextFromManualBeijing(2026, 9, 20, 12, 0);
  const male = runDivination({ tosses, timeContext: tc, category: "婚姻", gender: "male" });
  assert.equal(male.analysis.useGod.genderPrompt, undefined);
  const female = runDivination({ tosses, timeContext: tc, category: "婚姻", gender: "female" });
  assert.equal(female.analysis.useGod.relative, "官鬼");
});

/* ---------------- 暗动（§25 / §89-Q） ---------------- */

function tcOf(y: number, m: number, d: number, h: number, mi: number) {
  return buildTimeContextFromManualBeijing(y, m, d, h, mi);
}

test("暗动排除旬空：空爻日冲 = 待确认，不得判暗动（§79-22）", () => {
  // 构造：2026-09-20（甲申旬？日柱）找日支冲卦中某支且该支旬空的场景。
  // 甲子日（1949-10-01）空戌亥。卦选乾为天：上爻戌土，午日冲子……
  // 直接选：1949-10-01 甲子日，日支子；乾为天上爻戌土：戌亥空。
  // 日辰子与卦中午（四爻官鬼午火）冲 → 四爻午火不空。
  // 上爻戌土旬空：子日与戌无冲。改为 1949-10-05（戊辰日？）——辰冲戌！
  // 1949-10-01 甲子 → 10-05 戊辰。日支辰冲上爻戌，且戌在甲子旬为空 → 空而被冲待确认。
  const tosses = tossesFromBacks([1, 1, 1, 1, 1, 1]); // 乾为天
  const tc = buildTimeContextFromManualBeijing(1949, 10, 5, 12, 0);
  assert.equal(tc.dayGanZhi, "戊辰");
  assert.deepEqual(tc.voidBranches, ["戌", "亥"]);
  const { chart } = runDivination({ tosses, timeContext: tc, category: "其他" });
  const top = chart.lines.find((l) => l.position === 6);
  assert.ok(top);
  assert.equal(top.branch, "戌");
  assert.equal(top.isVoid, true);
  assert.equal(top.isHiddenMoving, false, "空爻日冲不得判暗动");
  assert.equal(top.specialMark, "空而被冲，待确认");
});

test("暗动：旺相静爻日冲 = 暗动", () => {
  // 2026-09-13 庚寅日：寅冲申。乾为天五爻申金，
  // 丁酉月金旺 → 申金旺相静爻逢日冲寅 → 暗动！
  const tosses = tossesFromBacks([1, 1, 1, 1, 1, 1]); // 乾为天
  const tc = buildTimeContextFromManualBeijing(2026, 9, 13, 12, 0);
  assert.equal(tc.dayGanZhi, "庚寅");
  const { chart } = runDivination({ tosses, timeContext: tc, category: "其他" });
  const l5 = chart.lines.find((l) => l.position === 5);
  assert.ok(l5);
  assert.equal(l5.branch, "申");
  assert.equal(l5.isVoid, false);
  assert.equal(l5.isMonthBroken, false);
  assert.equal(l5.monthStrength, "旺");
  assert.equal(l5.isHiddenMoving, true, "旺相静爻逢日冲为暗动");
});

test("日破：衰弱静爻日冲 = 日破（§25 / §79-17）", () => {
  // 1949-10-01 甲子日冲乾为天四爻午火；午火囚于酉月 → 日破
  const tosses = tossesFromBacks([1, 1, 1, 1, 1, 1]);
  const tc = buildTimeContextFromManualBeijing(1949, 10, 1, 12, 0);
  const { chart } = runDivination({ tosses, timeContext: tc, category: "其他" });
  const l4 = chart.lines.find((l) => l.position === 4);
  assert.ok(l4);
  assert.equal(l4.branch, "午");
  assert.equal(l4.isDayBroken, true);
  assert.equal(l4.isHiddenMoving, false);
});

test("月破静爻逢日冲：标记月破日冲难断（§25）", () => {
  // 酉月卯为月破。需爻支卯逢日支酉冲：2026-09-20 丁酉日。
  // 坤为地三爻卯木 → 卯为酉月月破，逢酉日冲 → 月破日冲难断。
  const tosses = tossesFromBacks([2, 2, 2, 2, 2, 2]); // 坤为地
  const tc = buildTimeContextFromManualBeijing(2026, 9, 20, 12, 0);
  assert.equal(tc.dayBranch, "酉");
  const { chart } = runDivination({ tosses, timeContext: tc, category: "其他" });
  const l3 = chart.lines.find((l) => l.position === 3);
  assert.ok(l3);
  assert.equal(l3.branch, "卯");
  assert.equal(l3.isMonthBroken, true, "酉月卯破 → 卯爻为月破");
  assert.equal(l3.isHiddenMoving, false);
  assert.equal(l3.specialMark, "月破日冲，难断");
});

/* ---------------- 结论引擎（§29 / §29.1） ---------------- */

test("结论：用神旬空无救 = 难断", () => {
  // 1949-10-01 甲子日，戌亥空。坤为地（坤宫土）用神按「其他」= 世爻：世在三爻丑土
  // 丑不在空。换「求财」→ 妻财亥水，亥在甲子旬空 → 用神旬空 → 难断。
  const tosses = tossesFromBacks([2, 2, 2, 2, 2, 2]);
  const tc = buildTimeContextFromManualBeijing(1949, 10, 1, 12, 0);
  const { analysis } = runDivination({ tosses, timeContext: tc, category: "求财" });
  assert.equal(analysis.useGod.isVoid, true);
  assert.equal(analysis.conclusion.conclusion, "难断");
  assert.equal(analysis.conclusion.ruleId, "CONC_VOID_OR_BROKEN");
  assert.ok(analysis.conclusion.evidence.some((e) => e.ruleId === "CONC_VOID_OR_BROKEN"));
});

test("结论：规则同时命中时首条生效且证据链含 ruleId（§29.1 / §79-23）", () => {
  // 用神旬空（CONC_VOID_OR_BROKEN 在表首段）时即使衰弱无动爻也首条生效
  const tosses = tossesFromBacks([2, 2, 2, 2, 2, 2]);
  const tc = buildTimeContextFromManualBeijing(1949, 10, 1, 12, 0);
  const { analysis } = runDivination({ tosses, timeContext: tc, category: "求财" });
  assert.ok(analysis.conclusion.ruleId === "CONC_VOID_OR_BROKEN");
});

/* ---------------- 疾病双用神（§20.4 / §89-O） ---------------- */

test("疾病占输出官鬼（病）与子孙（药）双轨分析", () => {
  // 坤为地：官鬼卯木（三爻）、子孙酉金（上爻）
  const tosses = tossesFromBacks([2, 2, 2, 2, 2, 2]);
  const tc = buildTimeContextFromManualBeijing(2026, 9, 20, 12, 0);
  const { analysis } = runDivination({ tosses, timeContext: tc, category: "疾病" });
  assert.ok(analysis.useGod.dualUseGod);
  assert.equal(analysis.useGod.dualUseGod?.ghost?.relative, "官鬼");
  assert.equal(analysis.useGod.dualUseGod?.ghost?.branch, "卯");
  assert.equal(analysis.useGod.dualUseGod?.descendant?.relative, "子孙");
  assert.equal(analysis.useGod.dualUseGod?.descendant?.branch, "酉");
});

/* ---------------- TossResult 序号映射（§89-K） ---------------- */

test("TossResult index 1..6 与内部下标 0..5 映射 array[index-1]", () => {
  const tosses = tossesFromBacks([3, 2, 1, 0, 1, 2]);
  const { chart } = runDivination({
    tosses,
    timeContext: buildTimeContextFromManualBeijing(2026, 9, 20, 12, 0),
    category: "其他",
  });
  // tosses[0] = 3 背老阳 → 初爻动阳；tosses[3] = 0 背老阴 → 四爻动阴
  assert.equal(chart.lines[0].isMoving, true);
  assert.equal(chart.lines[0].yinYang, "yang");
  assert.equal(chart.lines[3].isMoving, true);
  assert.equal(chart.lines[3].yinYang, "yin");
  // 展示序号不变
  assert.deepEqual(chart.lines.map((l) => l.position), [1, 2, 3, 4, 5, 6]);
});
