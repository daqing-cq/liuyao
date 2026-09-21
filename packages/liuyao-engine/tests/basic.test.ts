/** §63 基础测试：Coin 映射、卦序、八卦、纳支、纳甲天干、六亲、世应、六神 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lineTypeFromBacks, isMovingByBacks, tossOneLine, yinYangFromBacks,
  TRIGRAMS, trigramByLines, hexagramByLines, NA_JIA_TABLE,
  sixRelativeOf, runDivination, buildTimeContextFromManualBeijing,
} from "liuyao-engine";
import { tossesFromBacks } from "./helpers.ts";

test("Coin：0 → 老阴 → 动", () => {
  assert.equal(lineTypeFromBacks(0), "oldYin");
  assert.equal(isMovingByBacks(0), true);
  assert.equal(yinYangFromBacks(0), "yin");
});
test("Coin：1 → 少阳 → 静", () => {
  assert.equal(lineTypeFromBacks(1), "youngYang");
  assert.equal(isMovingByBacks(1), false);
  assert.equal(yinYangFromBacks(1), "yang");
});
test("Coin：2 → 少阴 → 静", () => {
  assert.equal(lineTypeFromBacks(2), "youngYin");
  assert.equal(isMovingByBacks(2), false);
  assert.equal(yinYangFromBacks(2), "yin");
});
test("Coin：3 → 老阳 → 动", () => {
  assert.equal(lineTypeFromBacks(3), "oldYang");
  assert.equal(isMovingByBacks(3), true);
  assert.equal(yinYangFromBacks(3), "yang");
});

test("卦序：初爻永远 index 0（展示序号 index-1）", () => {
  // 火天大有：1背、2背、3背、0背、1背、2背（§65-B 正式映射）
  const tosses = tossesFromBacks([1, 2, 3, 0, 1, 2]);
  assert.equal(tosses[0].index, 1);
  assert.equal(tosses[5].index, 6);
  const { chart } = runDivination({
    tosses,
    timeContext: buildTimeContextFromManualBeijing(2026, 9, 20, 19, 21),
    category: "其他",
  });
  // 本卦自下而上：阳阴阳（下离）阴阳阴（上坎）→ 水火既济（§65-B）
  assert.equal(chart.original.name, "水火既济");
  // 动爻：三爻、四爻
  const moving = chart.lines.filter((l) => l.isMoving).map((l) => l.position);
  assert.deepEqual(moving, [3, 4]);
  // 变卦：泽雷随
  assert.equal(chart.changing?.name, "泽雷随");
});

test("八卦：8 个经卦形态全部正确", () => {
  assert.deepEqual(TRIGRAMS["乾"].lines, ["yang", "yang", "yang"]);
  assert.deepEqual(TRIGRAMS["兑"].lines, ["yang", "yang", "yin"]);
  assert.deepEqual(TRIGRAMS["离"].lines, ["yang", "yin", "yang"]);
  assert.deepEqual(TRIGRAMS["震"].lines, ["yang", "yin", "yin"]);
  assert.deepEqual(TRIGRAMS["巽"].lines, ["yin", "yang", "yang"]);
  assert.deepEqual(TRIGRAMS["坎"].lines, ["yin", "yang", "yin"]);
  assert.deepEqual(TRIGRAMS["艮"].lines, ["yin", "yin", "yang"]);
  assert.deepEqual(TRIGRAMS["坤"].lines, ["yin", "yin", "yin"]);
  // 反查
  assert.equal(trigramByLines(["yang", "yin", "yin"]), "震");
  assert.equal(trigramByLines(["yin", "yang", "yin"]), "坎");
});

test("纳支：火天大有 初子 二寅 三辰 四酉 五未 上巳（§12 / §65 登记冲突）", () => {
  // 火天大有 = 下乾上离（上火下天），自下而上 '111101' → backs [1,1,1,1,2,1]
  // 权威纳支：下卦乾（内卦子寅辰）+ 上卦离（外卦酉未巳）。
  // 注意：开发文档 §12 示例写"火天大有 下卦离：卯丑亥 上卦乾：午申戌"，
  // 与卦名定义（火=离在上、天=乾在下）矛盾，属文档笔误，已登记规则冲突（§65 同类处理）：
  // 工程以卦名权威定义 + 正式纳甲表为准。该示例纳支（卯丑亥午申戌）实为下离上乾的"天火同人"。
  const tosses = tossesFromBacks([1, 1, 1, 1, 2, 1]);
  const { chart } = runDivination({
    tosses,
    timeContext: buildTimeContextFromManualBeijing(2026, 9, 20, 12, 0),
    category: "其他",
  });
  assert.equal(chart.original.name, "火天大有");
  const branches = chart.lines.map((l) => l.branch);
  assert.deepEqual(branches, ["子", "寅", "辰", "酉", "未", "巳"]);
  // 顺带验证天火同人（下离上乾）= 文档 §12 示例的纳支
  const tongren = tossesFromBacks([1, 2, 1, 1, 1, 1]); // '101111' 下离上乾
  const { chart: cr2 } = runDivination({
    tosses: tongren,
    timeContext: buildTimeContextFromManualBeijing(2026, 9, 20, 12, 0),
    category: "其他",
  });
  assert.equal(cr2.original.name, "天火同人");
  assert.deepEqual(cr2.lines.map((l) => l.branch), ["卯", "丑", "亥", "午", "申", "戌"]);
});

test("纳甲天干：乾外卦壬、坤外卦癸（§13 / §65-F）", () => {
  assert.equal(NA_JIA_TABLE["乾"].innerStem, "甲");
  assert.equal(NA_JIA_TABLE["乾"].outerStem, "壬");
  assert.equal(NA_JIA_TABLE["坤"].innerStem, "乙");
  assert.equal(NA_JIA_TABLE["坤"].outerStem, "癸");
  assert.equal(NA_JIA_TABLE["震"].outerStem, "庚");
  assert.equal(NA_JIA_TABLE["巽"].outerStem, "辛");
  assert.equal(NA_JIA_TABLE["坎"].outerStem, "戊");
  assert.equal(NA_JIA_TABLE["离"].outerStem, "己");
  assert.equal(NA_JIA_TABLE["艮"].outerStem, "丙");
  assert.equal(NA_JIA_TABLE["兑"].outerStem, "丁");

  // 乾为天：内卦甲子、甲寅、甲辰；外卦壬午、壬申、壬戌
  const t1 = tossesFromBacks([1, 1, 1, 1, 1, 1]);
  const { chart: c1 } = runDivination({
    tosses: t1,
    timeContext: buildTimeContextFromManualBeijing(2026, 9, 20, 12, 0),
    category: "其他",
  });
  assert.equal(c1.original.name, "乾为天");
  assert.deepEqual(
    c1.lines.map((l) => `${l.stem}${l.branch}`),
    ["甲子", "甲寅", "甲辰", "壬午", "壬申", "壬戌"]
  );

  // 坤为地：乙未、乙巳、乙卯、癸丑、癸亥、癸酉
  const t2 = tossesFromBacks([2, 2, 2, 2, 2, 2]);
  const { chart: c2 } = runDivination({
    tosses: t2,
    timeContext: buildTimeContextFromManualBeijing(2026, 9, 20, 12, 0),
    category: "其他",
  });
  assert.equal(c2.original.name, "坤为地");
  assert.deepEqual(
    c2.lines.map((l) => `${l.stem}${l.branch}`),
    ["乙未", "乙巳", "乙卯", "癸丑", "癸亥", "癸酉"]
  );
});

test("六亲：乾宫（金）木=妻财 土=父母 水=子孙 火=官鬼 金=兄弟", () => {
  assert.equal(sixRelativeOf("木", "金"), "妻财");
  assert.equal(sixRelativeOf("土", "金"), "父母");
  assert.equal(sixRelativeOf("水", "金"), "子孙");
  assert.equal(sixRelativeOf("火", "金"), "官鬼");
  assert.equal(sixRelativeOf("金", "金"), "兄弟");
});

test("世应：乾为天世上应三；火天大有世三应六；雷地豫世初应四（§11）", () => {
  const tc = () => buildTimeContextFromManualBeijing(2026, 9, 20, 12, 0);

  const c1 = runDivination({ tosses: tossesFromBacks([1, 1, 1, 1, 1, 1]), timeContext: tc(), category: "其他" });
  assert.equal(c1.chart.original.name, "乾为天");
  const shi1 = c1.chart.lines.find((l) => l.shiYing === "世");
  const ying1 = c1.chart.lines.find((l) => l.shiYing === "应");
  assert.equal(shi1?.position, 6);
  assert.equal(ying1?.position, 3);

  const c2 = runDivination({ tosses: tossesFromBacks([1, 1, 1, 1, 2, 1]), timeContext: tc(), category: "其他" });
  assert.equal(c2.chart.original.name, "火天大有");
  const shi2 = c2.chart.lines.find((l) => l.shiYing === "世");
  const ying2 = c2.chart.lines.find((l) => l.shiYing === "应");
  assert.equal(shi2?.position, 3); // 归魂世三应六（§65-E），禁止世五应二
  assert.equal(ying2?.position, 6);

  // 雷地豫：下坤上震，自下而上 '000100' → backs [2,2,2,1,2,2]
  const c3 = runDivination({ tosses: tossesFromBacks([2, 2, 2, 1, 2, 2]), timeContext: tc(), category: "其他" });
  assert.equal(c3.chart.original.name, "雷地豫");
  const shi3 = c3.chart.lines.find((l) => l.shiYing === "世");
  const ying3 = c3.chart.lines.find((l) => l.shiYing === "应");
  assert.equal(shi3?.position, 1);
  assert.equal(ying3?.position, 4);
});

test("六神：甲日起青龙；庚日起白虎，自初爻向上（§15）", () => {
  // 甲子日：2026-09-20 前后找甲子日 → 直接用 1949-10-01（甲子日）
  const tcJia = buildTimeContextFromManualBeijing(1949, 10, 1, 12, 0);
  assert.equal(tcJia.dayGanZhi, "甲子");
  const cJia = runDivination({
    tosses: tossesFromBacks([1, 1, 1, 1, 1, 1]),
    timeContext: tcJia, category: "其他",
  });
  assert.deepEqual(
    cJia.chart.lines.map((l) => l.sixGod),
    ["青龙", "朱雀", "勾陈", "螣蛇", "白虎", "玄武"]
  );

  // 庚寅日：2026-09-13（由 JDN 锚点公式计算，1949-10-01 甲子起算）
  const tcGeng = buildTimeContextFromManualBeijing(2026, 9, 13, 12, 0);
  assert.equal(tcGeng.dayGanZhi, "庚寅");
  const cGeng = runDivination({
    tosses: tossesFromBacks([1, 1, 1, 1, 1, 1]),
    timeContext: tcGeng, category: "其他",
  });
  assert.deepEqual(
    cGeng.chart.lines.map((l) => l.sixGod),
    ["白虎", "玄武", "青龙", "朱雀", "勾陈", "螣蛇"]
  );
});

test("变卦六亲以本卦宫五行为我（§14.1 / §65-G）", () => {
  // 水火既济（坎宫水）：三爻动 → 变卦泽雷随的三爻变爻六亲按坎宫水算
  const tosses = tossesFromBacks([1, 2, 3, 0, 1, 2]);
  const { chart } = runDivination({
    tosses,
    timeContext: buildTimeContextFromManualBeijing(2026, 9, 20, 19, 21),
    category: "其他",
  });
  assert.equal(chart.original.name, "水火既济");
  assert.equal(chart.original.palace, "坎");
  assert.equal(chart.changing?.name, "泽雷随");
  // 变卦三爻（亥水变……实际：既济三爻亥水动 → 随卦三爻泽雷随下震：三爻辰？随卦下震纳庚子寅辰
  // 三爻 = 震外?否——随卦下震内卦三支 子寅辰，三爻为辰土；坎宫水：土克水 → 官鬼
  const l3 = chart.lines.find((l) => l.position === 3);
  assert.ok(l3);
  assert.equal(l3.changedRelative, "官鬼"); // 辰土对坎宫水 = 克我者官鬼
});
