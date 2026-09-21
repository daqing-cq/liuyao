/**
 * 时间引擎（§16）
 *
 * 规则：
 *   1. 强制北京时间 Asia/Shanghai / UTC+8；不使用浏览器时区作为六爻时间。
 *   2. 年柱以立春换年；月柱以十二节换月（按交节时刻，非交节日 0 点，§16.3）。
 *   3. 日柱以北京时间 23:00 换日；换算前先将 23:00–23:59 的时刻加 1 小时归入次日。
 *   4. 月柱不因 23:00 换日而改变，仍按节气（§16.4）。
 *   5. 手动排盘支持 1900–2100；超出范围禁止排盘并明确提示，不得外推。
 *   6. IANA Asia/Shanghai 历史换算（§16.4）：1991 年前北京存在夏令时，
 *      时间戳 -> 北京年月日时分 一律通过 Intl 时区 API 完成，禁止手写固定偏移。
 */
import type { Branch, Stem, TimeContext } from "../types.js";
import { BRANCH_ELEMENTS, BRANCHES, GAN_ZHI_60, STEMS, chongOf } from "../data/branches.js";
import type { SolarTermEntry } from "../data/solarTerms.js";

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

/** 旬空正式表（§17） */
export const XUN_VOID_TABLE: Array<{
  xun: string;
  startIdx: number;
  voids: [Branch, Branch];
}> = [
  { xun: "甲子", startIdx: 0, voids: ["戌", "亥"] },
  { xun: "甲戌", startIdx: 10, voids: ["申", "酉"] },
  { xun: "甲申", startIdx: 20, voids: ["午", "未"] },
  { xun: "甲午", startIdx: 30, voids: ["辰", "巳"] },
  { xun: "甲辰", startIdx: 40, voids: ["寅", "卯"] },
  { xun: "甲寅", startIdx: 50, voids: ["子", "丑"] },
];

/**
 * JDN（儒略日数）计算（§16.2）。
 * 注意：整数除法使用向零截断（Math.trunc），不得用 Math.floor，
 * 否则 1 月、2 月的负偏移结果会偏差 1–2 天。
 */
export function jdn(y: number, m: number, d: number): number {
  const a = Math.trunc((m - 14) / 12);
  return (
    Math.trunc((1461 * (y + 4800 + a)) / 4) +
    Math.trunc((367 * (m - 2 - 12 * a)) / 12) -
    Math.trunc((3 * Math.trunc((y + 4900 + a) / 100)) / 4) +
    d -
    32075
  );
}

/** idx = (JDN + 49) mod 60，idx 0 = 甲子（§16.2） */
export function dayGanZhiIndex(y: number, m: number, d: number): number {
  return (((jdn(y, m, d) + 49) % 60) + 60) % 60;
}

/**
 * 将一个 UTC 时间戳转换为北京时间的年月日时分秒。
 * 使用 Intl 时区 API（IANA Asia/Shanghai），正确处理历史夏令时（§16.4）。
 */
export function beijingParts(timestampMs: number): {
  year: number; month: number; day: number; hour: number; minute: number; second: number;
} {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(new Date(timestampMs));
  const get = (t: string): number => {
    const p = parts.find((x) => x.type === t);
    if (!p) throw new Error(`Intl.DateTimeFormat 缺少字段 ${t}`);
    return parseInt(p.value, 10);
  };
  let hour = get("hour");
  if (hour === 24) hour = 0; // 某些环境 midnight 显示 24
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 节气表数据结构：每条为某一节气的精确时刻（北京时间分钟） */
export type SolarTermEntry2 = SolarTermEntry;

/**
 * 二十四节气时刻表（1900–2100，精确到分钟）。
 * 数据来源：scripts/build-solar-terms.mjs（VSOP87D 截断 + Meeus 25 章 + Espenak/Meeus ΔT）
 * 生成，写入 src/data/solarTerms.ts 并附 FNV-1a 校验和。
 */
import { SOLAR_TERMS_MS, SOLAR_TERMS_CHECKSUM } from "../data/solarTerms.js";

export { SOLAR_TERMS_MS, SOLAR_TERMS_CHECKSUM };

const TERM_TO_MONTH_BRANCH: Record<string, Branch> = {
  立春: "寅", 惊蛰: "卯", 清明: "辰", 立夏: "巳", 芒种: "午", 小暑: "未",
  立秋: "申", 白露: "酉", 寒露: "戌", 立冬: "亥", 大雪: "子", 小寒: "丑",
};

/** 十二节（换月用）名称，对应寅→丑月 */
export const JIE_NAMES = [
  "立春", "惊蛰", "清明", "立夏", "芒种", "小暑",
  "立秋", "白露", "寒露", "立冬", "大雪", "小寒",
] as const;

/** 全表排序后的十二节时刻（ms），供二分查找 */
const JIE_TIMELINE: Array<{ name: string; ms: number }> = (() => {
  const out = SOLAR_TERMS_MS.filter((e) => TERM_TO_MONTH_BRANCH[e.name] !== undefined);
  out.sort((a, b) => a.ms - b.ms);
  return out.map((e) => ({ name: e.name, ms: e.ms }));
})();

/** 在给定时刻之前（含）最近的一次十二节 */
function prevJie(timestampMs: number): { name: string; ms: number } {
  let lo = 0;
  let hi = JIE_TIMELINE.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (JIE_TIMELINE[mid].ms <= timestampMs) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (ans < 0) {
    throw new Error(`节气数据范围不足：早于 ${MIN_YEAR} 年立春（§16.3 禁止外推）`);
  }
  const e = JIE_TIMELINE[ans];
  if (!e) throw new Error("节气时间线为空");
  return e;
}

/** 立春时刻查找（年柱换年用）：在时间轴上向前回溯最近一次"立春" */
function lichunAtOrBefore(timestampMs: number): number {
  for (let i = JIE_TIMELINE.length - 1; i >= 0; i--) {
    const e = JIE_TIMELINE[i];
    if (e && e.ms <= timestampMs) {
      let j = i;
      while (j >= 0) {
        const e2 = JIE_TIMELINE[j];
        if (e2 && e2.name === "立春") return e2.ms;
        j--;
      }
      break;
    }
  }
  throw new Error(`节气数据范围不足：早于 ${MIN_YEAR} 年立春（§16.3 禁止外推）`);
}

/** 当前时刻之后最近的一次立春（年柱换年用） */
function nextLichunAfter(timestampMs: number): number {
  for (let i = 0; i < JIE_TIMELINE.length; i++) {
    const e = JIE_TIMELINE[i];
    if (e && e.name === "立春" && e.ms > timestampMs) return e.ms;
  }
  // timestamp 在最后一次立春之后（2100 年末），用前一次立春
  return lichunAtOrBefore(timestampMs);
}

/** 五虎遁（§16.1）：年干 -> 寅月天干索引（0=甲） */
export function yinMonthStemIndex(yearStem: Stem): number {
  switch (yearStem) {
    case "甲":
    case "己":
      return 2; // 丙
    case "乙":
    case "庚":
      return 4; // 戊
    case "丙":
    case "辛":
      return 6; // 庚
    case "丁":
    case "壬":
      return 8; // 壬
    case "戊":
    case "癸":
      return 0; // 甲
  }
}

/**
 * 由北京公历年月日时分构造完整时间上下文。
 * 输入必须是"北京墙上时间"的成分（由 beijingParts 或手动排盘输入提供）。
 * yearGanZhi 按立春换年；monthGanZhi 按十二节交节时刻换月 + 五虎遁定月干；
 * 日柱按 23:00 换日（23:00–23:59 归入次日）。
 */
export function buildTimeContextFromBeijing(
  timestampMs: number,
  bp: { year: number; month: number; day: number; hour: number; minute: number; second: number }
): TimeContext {
  if (bp.year < MIN_YEAR || bp.year > MAX_YEAR) {
    throw new Error(
      `超出支持范围（${MIN_YEAR}–${MAX_YEAR}）：禁止排盘并明确提示，不得外推（§16.3）`
    );
  }

  // 日柱：23:00 换日 —— 将 23:00–23:59 的时刻加 1 小时归入次日，再取该日日柱。
  // 以 JDN 直接对"日偏移"计算：先把 y/m/d 组成 UTC 中午（避免 DST 边界问题）求 JDN。
  const dayShift = bp.hour >= 23 ? 1 : 0;
  const noonUtc = Date.UTC(bp.year, bp.month - 1, bp.day, 12, 0, 0);
  const dayIdxRaw = dayGanZhiIndex(
    new Date(noonUtc).getUTCFullYear(),
    new Date(noonUtc).getUTCMonth() + 1,
    new Date(noonUtc).getUTCDate()
  );
  const dayIdx = (((dayIdxRaw + dayShift) % 60) + 60) % 60;
  const dayGanZhi = GAN_ZHI_60[dayIdx];
  if (!dayGanZhi) throw new Error("日柱索引越界");
  const dayStem = STEMS[dayIdx % 10] as Stem;
  const dayBranch = BRANCHES[dayIdx % 12] as Branch;

  // 年柱：立春换年（按时刻判断）。
  // 逻辑：找当前时刻之后最近的一次立春 lichunNext；若 timestamp < lichunNext，
  // 则农历年 = lichunNext 的北京年份 - 1；否则 = lichunNext 的北京年份。
  const lichunNextMs = nextLichunAfter(timestampMs);
  const lichunNextBp = beijingParts(lichunNextMs);
  const gzYear =
    timestampMs < lichunNextMs ? lichunNextBp.year - 1 : lichunNextBp.year;
  const yearStemIdx = (((gzYear - 4) % 10) + 10) % 10; // 甲=0：公元4年为甲子年
  const yearBranchIdx = (((gzYear - 4) % 12) + 12) % 12;
  const yearGanZhi = `${STEMS[yearStemIdx]}${BRANCHES[yearBranchIdx]}`;

  // 月柱：十二节换月（按交节时刻）
  const jie = prevJie(timestampMs);
  const monthBranch = TERM_TO_MONTH_BRANCH[jie.name];
  if (!monthBranch) throw new Error(`十二节映射缺失: ${jie.name}`);

  // 月支序：寅=0 … 丑=11（月支自寅正月起）
  const monthBranchIdx = BRANCHES.indexOf(monthBranch); // 0=子
  const monthsFromYin = (((monthBranchIdx - 2) % 12) + 12) % 12;

  // 月干：五虎遁由年干起寅月，顺推
  const yinStemIdx = yinMonthStemIndex(STEMS[yearStemIdx] as Stem);
  const monthStemIdx = (yinStemIdx + monthsFromYin) % 10;
  const monthGanZhi = `${STEMS[monthStemIdx]}${monthBranch}`;

  // 旬空：日柱在六十甲子中的旬
  const xunEntry = XUN_VOID_TABLE.find((x) => dayIdx >= x.startIdx && dayIdx < x.startIdx + 10);
  if (!xunEntry) throw new Error(`旬空表异常: dayIdx=${dayIdx}`);
  // 旬名 = 甲 + 旬首地支
  const xunName = `甲${BRANCHES[xunEntry.startIdx % 12]}`;

  // 月破：与月建相冲（§18）
  const monthBrokenBranches = [chongOf(monthBranch)] as Branch[];

  const beijingDate = `${bp.year}-${pad2(bp.month)}-${pad2(bp.day)}`;
  const beijingTime = `${pad2(bp.hour)}:${pad2(bp.minute)}`;

  return {
    timestamp: new Date(timestampMs).toISOString(),
    timezone: "Asia/Shanghai",
    beijingDate,
    beijingTime,
    yearGanZhi,
    monthGanZhi,
    dayGanZhi,
    monthBranch,
    dayStem,
    dayBranch,
    xun: xunName,
    voidBranches: [...xunEntry.voids],
    monthBrokenBranches,
  };
}

/** 由 UTC 时间戳构造（在线起卦入口） */
export function buildTimeContext(timestampMs: number): TimeContext {
  const bp = beijingParts(timestampMs);
  return buildTimeContextFromBeijing(timestampMs, bp);
}

/**
 * 手动排盘（§41）：由用户选择的北京墙上时间构造。
 * 直接以该墙上时间视为 Asia/Shanghai 时刻（1900–2100 内含历史夏令时，
 * 通过遍历 UTC 偏移候选取墙上时间一致者）。
 */
export function buildTimeContextFromManualBeijing(
  year: number, month: number, day: number, hour: number, minute: number
): TimeContext {
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new Error(
      `超出支持范围（${MIN_YEAR}–${MAX_YEAR}）：禁止排盘并明确提示，不得外推（§16.3）`
    );
  }
  // 遍历候选 UTC 时间（±14h 内每 15 分钟），取 beijingParts 恰好等于输入的解；
  // DST 重叠时段取第一个匹配（stable）。
  const target = { year, month, day, hour, minute };
  for (let offMin = 0; offMin <= 15 * 60; offMin += 15) {
    const ts = Date.UTC(year, month - 1, day, hour, minute) - offMin * 60 * 1000;
    const bp = beijingParts(ts);
    if (
      bp.year === target.year && bp.month === target.month && bp.day === target.day &&
      bp.hour === target.hour && bp.minute === target.minute
    ) {
      return buildTimeContextFromBeijing(ts, bp);
    }
  }
  // 不存在（如夏令时跳变 02:30）：向上取整到下一个存在的时间
  for (let addMin = 1; addMin <= 120; addMin++) {
    const ts = Date.UTC(year, month - 1, day, hour, minute) + addMin * 60 * 1000;
    const bp = beijingParts(ts);
    if (bp.hour === hour && bp.minute === minute + addMin) {
      return buildTimeContextFromBeijing(ts, bp);
    }
  }
  throw new Error("所选北京时间在该日期不存在（夏令时跳变），请调整时间");
}

export function branchElement(b: Branch) {
  return BRANCH_ELEMENTS[b];
}
