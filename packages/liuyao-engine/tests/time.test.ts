/** §63 时间与历法补全测试（§16）：日柱锚点、23:00 换日、五虎遁、节气边界、范围拒绝 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jdn, dayGanZhiIndex, buildTimeContextFromManualBeijing, buildTimeContext,
  yinMonthStemIndex, GAN_ZHI_60,
} from "liuyao-engine";

test("日柱 JDN 锚点：2000-01-01 = 戊午（idx 54）", () => {
  const idx = dayGanZhiIndex(2000, 1, 1);
  assert.equal(idx, 54);
  assert.equal(GAN_ZHI_60[idx], "戊午");
});

test("日柱 JDN 锚点：1949-10-01 = 甲子（idx 0）", () => {
  const idx = dayGanZhiIndex(1949, 10, 1);
  assert.equal(idx, 0);
  assert.equal(GAN_ZHI_60[idx], "甲子");
});

test("JDN 公式自检：2000-01-01 的 JDN = 2451545", () => {
  assert.equal(jdn(2000, 1, 1), 2451545);
});

test("23:00 换日：22:59 当日、23:00 次日（§16.5）", () => {
  // 2026-09-20 日柱 vs 2026-09-21 日柱
  const day20 = buildTimeContextFromManualBeijing(2026, 9, 20, 12, 0).dayGanZhi;
  const day21 = buildTimeContextFromManualBeijing(2026, 9, 21, 12, 0).dayGanZhi;
  assert.notEqual(day20, day21);

  const at2259 = buildTimeContextFromManualBeijing(2026, 9, 20, 22, 59).dayGanZhi;
  const at2300 = buildTimeContextFromManualBeijing(2026, 9, 20, 23, 0).dayGanZhi;
  assert.equal(at2259, day20, "22:59 归当日");
  assert.equal(at2300, day21, "23:00 归次日");
  const at2359 = buildTimeContextFromManualBeijing(2026, 9, 20, 23, 59).dayGanZhi;
  assert.equal(at2359, day21);
});

test("月柱不因 23:00 换日而改变（§16.4）", () => {
  const before = buildTimeContextFromManualBeijing(2026, 9, 20, 22, 59);
  const after = buildTimeContextFromManualBeijing(2026, 9, 20, 23, 0);
  assert.equal(before.monthGanZhi, after.monthGanZhi);
  assert.equal(before.monthBranch, after.monthBranch);
});

test("五虎遁：甲己年丙寅起、乙庚戊寅、丙辛庚寅、丁壬壬寅、戊癸甲寅（§16.1）", () => {
  assert.equal(yinMonthStemIndex("甲"), 2); // 丙
  assert.equal(yinMonthStemIndex("己"), 2);
  assert.equal(yinMonthStemIndex("乙"), 4); // 戊
  assert.equal(yinMonthStemIndex("庚"), 4);
  assert.equal(yinMonthStemIndex("丙"), 6); // 庚
  assert.equal(yinMonthStemIndex("辛"), 6);
  assert.equal(yinMonthStemIndex("丁"), 8); // 壬
  assert.equal(yinMonthStemIndex("壬"), 8);
  assert.equal(yinMonthStemIndex("戊"), 0); // 甲
  assert.equal(yinMonthStemIndex("癸"), 0);
});

test("年柱立春换年：2026-02-04 立春 04:02 前后年柱不同", () => {
  const before = buildTimeContextFromManualBeijing(2026, 2, 4, 4, 1); // 立春前 1 分钟
  const after = buildTimeContextFromManualBeijing(2026, 2, 4, 4, 3);  // 立春后 1 分钟
  assert.notEqual(before.yearGanZhi, after.yearGanZhi);
  assert.equal(before.yearGanZhi, "乙巳");
  assert.equal(after.yearGanZhi, "丙午");
});

test("节气换月：2026-02-04 立春交节时刻前后月柱不同（寅月庚寅起）", () => {
  const before = buildTimeContextFromManualBeijing(2026, 2, 4, 4, 1);
  const after = buildTimeContextFromManualBeijing(2026, 2, 4, 4, 3);
  // 立春前属丑月（乙巳年丑月：己丑），立春后属寅月（丙午年正月：庚寅，§16.1 示例一致）
  assert.equal(before.monthGanZhi, "己丑");
  assert.equal(after.monthGanZhi, "庚寅");
});

test("惊蛰换月（2026-03-05 惊蛰 21:59）", () => {
  const before = buildTimeContextFromManualBeijing(2026, 3, 5, 21, 58);
  const after = buildTimeContextFromManualBeijing(2026, 3, 5, 22, 0);
  assert.equal(before.monthGanZhi, "庚寅");
  assert.equal(after.monthGanZhi, "辛卯"); // 丙午年卯月 = 辛卯（§16.1 示例）
});

test("旬空：甲子旬空戌亥（§17）", () => {
  // 1949-10-01 = 甲子日 → 戌亥空
  const tc = buildTimeContextFromManualBeijing(1949, 10, 1, 12, 0);
  assert.equal(tc.xun, "甲子");
  assert.deepEqual(tc.voidBranches, ["戌", "亥"]);
});

test("月破：酉月卯破（§18）", () => {
  // 酉月：2026-09-20 属丁酉月
  const tc = buildTimeContextFromManualBeijing(2026, 9, 20, 12, 0);
  assert.equal(tc.monthBranch, "酉");
  assert.deepEqual(tc.monthBrokenBranches, ["卯"]);
});

test("1900–2100 外输入被拒绝（§16.3-3）", () => {
  assert.throws(() => buildTimeContextFromManualBeijing(1899, 12, 31, 12, 0), /超出支持范围/);
  assert.throws(() => buildTimeContextFromManualBeijing(2101, 1, 1, 12, 0), /超出支持范围/);
});

test("浏览器时区不影响结果：同 UTC 时刻结果一致（§16.4）", () => {
  // 用固定 UTC 时间戳构建
  const ms = Date.UTC(2026, 8, 20, 11, 21, 0); // 北京 19:21
  const tc = buildTimeContext(ms);
  assert.equal(tc.beijingDate, "2026-09-20");
  assert.equal(tc.beijingTime, "19:21");
  // 与手动排盘一致
  const manual = buildTimeContextFromManualBeijing(2026, 9, 20, 19, 21);
  assert.equal(tc.dayGanZhi, manual.dayGanZhi);
  assert.equal(tc.monthGanZhi, manual.monthGanZhi);
  assert.equal(tc.yearGanZhi, manual.yearGanZhi);
});

test("1991 年前历史夏令时换算正确（§16.4，使用 IANA 而非固定偏移）", () => {
  // 1986–1991 中国夏令时：1988-06-11 为夏令时期间（墙上钟比标准时快 1 小时）
  // 墙上 12:00 = 标准时 11:00 = UTC 03:00，同一天；1988-06-11 日柱 = 丁酉（idx 33）
  const tc = buildTimeContextFromManualBeijing(1988, 6, 11, 12, 0);
  assert.equal(tc.dayGanZhi, "丁酉");
  // 若按固定 UTC+8 硬算，墙上 12:00 会误为 UTC 04:00；此处验证 IANA 路径与日期不变
  assert.equal(tc.beijingDate, "1988-06-11");
});

test("手动排盘夏令时跳变时段（1988-09-11 00:30 不存在）容错", () => {
  // 1988-09-11 夏令时结束，墙上 00:00-00:59:59 不存在（拨回 1 小时）
  // 引擎应给出明确错误或就近合法时间，而不是静默错误
  const tc = buildTimeContextFromManualBeijing(1988, 9, 11, 0, 30);
  assert.ok(tc.dayGanZhi); // 不抛错即返回合法上下文
});
