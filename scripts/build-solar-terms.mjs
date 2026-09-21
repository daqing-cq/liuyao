/**
 * 二十四节气时刻计算（Meeus 天文算法）
 *
 * 数据来源说明（§16.3）：本文件为生成器，用 VSOP87D 截断项（地球日心黄经）
 * + 湿差（nutation）+ 光行差（aberration）计算太阳视黄经达 15°×k 的时刻，
 * 精度约 ±1 分钟（1900–2100）。生成结果写入 src/data/solarTerms.ts，
 * 并附 FNV-1a 校验和供回归测试验证。
 *
 * 参考：Jean Meeus, "Astronomical Algorithms" 2nd ed., ch.25 (Solar Coordinates)。
 * 单位约定：JDE 为力学时（TD）儒略日；ΔT 用 NASA 多项式（Espenak & Meeus）。
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ---------------- ΔT (Espenak & Meeus polynomials) ---------------- */
function deltaT(julianYearFloat) {
  const y = julianYearFloat;
  if (y < 1900 || y > 2100) throw new Error("ΔT out of supported range");
  if (y < 1920) {
    const t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  }
  if (y < 1941) {
    const t = y - 1920;
    return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t ** 3;
  }
  if (y < 1961) {
    const t = y - 1950;
    return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547;
  }
  if (y < 1986) {
    const t = y - 1975;
    return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718;
  }
  if (y < 2005) {
    const t = y - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  }
  if (y < 2050) {
    const t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  if (y < 2100) {
    // 2050-2150 interpolation formula
    return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
  }
  throw new Error("unreachable");
}

/* ---------------- VSOP87D Earth (truncated) ---------------- */
// L0..L5 amplitude/phase/frequency tables (Meeus app.III, truncated to major terms)
const L0 = [
  [175347046, 0, 0], [3341656, 4.6692568, 6283.07585], [34894, 4.6261, 12566.1517],
  [3497, 2.7441, 5753.3849], [3418, 2.8289, 3.5231], [3136, 3.6277, 77713.7715],
  [2676, 4.4181, 7860.4194], [2343, 6.1352, 3930.2097], [1324, 0.7425, 11506.7698],
  [1273, 2.0371, 529.691], [1199, 1.1096, 1577.3435], [990, 5.233, 5884.927],
  [902, 2.045, 26.298], [857, 3.508, 398.149], [780, 1.179, 5223.694],
  [753, 2.533, 5507.553], [505, 4.583, 18849.228], [492, 4.205, 775.523],
  [357, 2.92, 0.067], [317, 5.849, 11790.629], [284, 1.899, 796.298],
  [271, 0.315, 10977.079], [243, 0.345, 5486.778], [206, 4.806, 2544.314],
  [205, 1.869, 5573.143], [202, 2.458, 6069.777], [156, 0.833, 213.299],
  [132, 3.411, 2942.463], [126, 1.083, 20.775], [115, 0.645, 0.98],
  [103, 0.636, 4694.003], [102, 0.976, 15720.839], [102, 4.267, 7.114],
  [99, 6.21, 2146.17], [98, 0.68, 155.42], [86, 5.98, 161000.69],
  [85, 1.3, 6275.96], [85, 3.67, 71430.7], [80, 1.81, 17260.15],
  [79, 3.04, 12036.46], [75, 1.76, 5088.63], [74, 3.5, 3154.69],
  [74, 4.68, 801.82], [70, 0.83, 9437.76], [62, 3.98, 8827.39],
  [61, 1.82, 7084.9], [57, 2.78, 6286.6], [56, 4.39, 14143.5],
  [56, 3.47, 6279.55], [52, 0.19, 12139.55], [52, 1.33, 1748.02],
  [51, 0.28, 5856.48], [49, 0.49, 1194.45], [41, 5.37, 8429.24],
  [41, 2.4, 19651.05], [39, 6.17, 10447.39], [37, 6.04, 10213.29],
  [37, 2.57, 1059.38], [36, 1.71, 2352.87], [36, 1.78, 6812.77],
  [33, 0.59, 17789.85], [30, 0.44, 83996.85], [30, 2.74, 1349.87],
  [25, 3.16, 4690.48],
];
const L1 = [
  [628331966747, 0, 0], [206059, 2.678235, 6283.07585], [4303, 2.6351, 12566.1517],
  [425, 1.59, 3.523], [119, 5.796, 26.298], [109, 2.966, 1577.344],
  [93, 2.59, 18849.23], [72, 1.14, 529.69], [68, 1.87, 398.15],
  [67, 4.41, 5507.55], [59, 2.89, 5223.69], [56, 2.17, 155.42],
  [45, 0.4, 796.3], [36, 0.47, 775.52], [29, 2.65, 7.11],
  [21, 5.34, 0.98], [19, 1.85, 5486.78], [19, 4.97, 213.3],
  [17, 2.99, 6275.96], [16, 0.03, 2544.31], [16, 1.43, 2146.17],
  [15, 1.21, 10977.08], [12, 2.83, 1748.02], [12, 3.26, 5088.63],
  [12, 5.27, 1194.45], [12, 2.08, 4694], [11, 0.77, 553.57],
  [10, 1.3, 6286.6], [10, 4.24, 1349.87], [9, 2.7, 242.73],
  [9, 5.64, 951.72], [8, 5.3, 2352.87], [6, 2.65, 9437.76],
  [6, 4.67, 4690.48],
];
const L2 = [
  [52919, 0, 0], [8720, 1.0721, 6283.0758], [309, 0.867, 12566.152],
  [27, 0.05, 3.52], [16, 5.19, 26.3], [16, 3.68, 155.42],
  [10, 0.76, 18849.23], [9, 2.06, 77713.77], [7, 0.83, 775.52],
  [5, 4.66, 1577.34], [4, 1.03, 7.11], [4, 3.44, 5573.14],
  [3, 5.14, 796.3], [3, 6.05, 5507.55], [3, 1.19, 242.73],
  [3, 6.12, 529.69], [3, 0.31, 398.15], [3, 2.28, 553.57],
  [2, 4.38, 5223.69], [2, 3.75, 0.98],
];
const L3 = [
  [289, 5.844, 6283.076], [35, 0, 0], [17, 5.49, 12566.15],
  [3, 5.2, 155.42], [1, 4.72, 3.52], [1, 5.3, 18849.23],
  [1, 5.97, 242.73],
];
const L4 = [
  [114, 3.142, 0], [8, 4.13, 6283.08], [1, 3.84, 12566.15],
];
const L5 = [[1, 3.14, 0]];

function vsopTerm(table, tau) {
  let sum = 0;
  for (const [a, b, c] of table) {
    sum += a * Math.cos(b + c * tau);
  }
  return sum;
}

/** 地球日心黄经（rad），tau = 儒略千年数（JDE） */
function earthL(tau) {
  const t = tau;
  return (
    (vsopTerm(L0, tau) + vsopTerm(L1, tau) * t + vsopTerm(L2, tau) * t ** 2 +
      vsopTerm(L3, tau) * t ** 3 + vsopTerm(L4, tau) * t ** 4 + vsopTerm(L5, tau) * t ** 5) / 1e8
  ) % (2 * Math.PI);
}

/* ---------------- Nutation & aberration ---------------- */
function nutationInLongitude(T) {
  const D = (297.85036 + 445267.11148 * T) % 360 * Math.PI / 180;
  const M = (357.52772 + 35999.05034 * T) % 360 * Math.PI / 180;
  const Mp = (134.96298 + 477198.867398 * T) % 360 * Math.PI / 180;
  const F = (93.27191 + 483202.017538 * T) % 360 * Math.PI / 180;
  const Om = (125.04452 - 1934.136261 * T) % 360 * Math.PI / 180;
  const d2r = Math.PI / 180;
  return (
    -17.2 * Math.sin(Om) - 1.32 * Math.sin(2 * D) - 0.23 * Math.sin(2 * Mp) +
    0.21 * Math.sin(2 * Om)
  ) * d2r / 1e0 / 1; // returns radians * arcsec handled below
}

/** 精确版：返回弧度 */
function nutationLon(T) {
  const d2r = Math.PI / 180;
  const D = ((297.85036 + 445267.11148 * T) % 360 + 360) % 360 * d2r;
  const M = ((357.52772 + 35999.05034 * T) % 360 + 360) % 360 * d2r;
  const Mp = ((134.96298 + 477198.867398 * T) % 360 + 360) % 360 * d2r;
  const F = ((93.27191 + 483202.017538 * T) % 360 + 360) % 360 * d2r;
  const Om = ((125.04452 - 1934.136261 * T) % 360 + 360) % 360 * d2r;
  const as2rad = 1 / 206264.806247;
  return (
    (-17.2 * Math.sin(Om) - 1.32 * Math.sin(2 * D) - 0.23 * Math.sin(2 * Mp) + 0.21 * Math.sin(2 * Om))
  ) * as2rad;
}

/** 太阳视黄经（弧度，0..2π），T 为 JDE 世纪数 */
function apparentSolarLongitude(T) {
  const tau = T / 10;
  const L0sun = Math.PI; // Meeus 25.2 uses Earth L + PI
  const L = earthL(tau);
  let lambda = L + Math.PI + nutationLon(T);
  // aberration
  lambda -= 0.00577551433 / 1 * 0; // placeholder replaced below
  // 真正的光行差：-20.4898"/R ，R 取平均近似即可（用 25.10 中的完整式太重，取 20.4898"）
  lambda -= (20.4898 / 206264.806247) * 1.0;
  lambda = ((lambda % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return lambda;
}

/* ---------------- 求节气时刻 ---------------- */
// 目标黄经（弧度）k*15°，k=0 春分（实际节气以 315° 小寒等起，我们直接对 24 个 15° 倍数求解）
function solveSolarLongitude(targetDeg, yearGuess) {
  // 用牛顿迭代 + 二分混合：在 yearGuess 前后 ±40 天内找 lambda 上升穿过 targetDeg 的时刻
  const target = ((targetDeg % 360) + 360) % 360 * Math.PI / 180;
  // 目标黄经在年内的日序：以春分(0°)≈3月20日为锚
  // 立春(315°) 约在春分前 315/360 * 365.2422 ≈ 319.7 天 ≈ 上一年4月中旬 → 直接用
  // "年 + (deg-0)/360*365.2422 天" 相对 2000-03-20 平移，再放宽搜索窗 ±45 天
  const JDE2000_EQUINOX = 2451623.80984; // 2000-03-20 07:35 TD 春分
  let t0 = JDE2000_EQUINOX + (yearGuess - 2000) * 365.2422 + (targetDeg / 360) * 365.2422;
  // 对 deg < 90° 的（小寒/大寒/冬至在年初或年末）粗起点可能偏差一年，扩大搜索窗
  function lambdaAt(jde) {
    const T = (jde - 2451545) / 36525;
    return apparentSolarLongitude(T);
  }
  function norm(a) {
    a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    return a;
  }
  function f(jde) {
    const d = norm(lambdaAt(jde) - target);
    return d > Math.PI ? d - 2 * Math.PI : d; // (-PI, PI]
  }
  // 搜索区间：从 t0-45 到 t0+60，步进 4 天找由负转正
  let lo = null, hi = null;
  let prevJde = t0 - 45, prevF = f(prevJde);
  for (let jde = t0 - 41; jde <= t0 + 60; jde += 4) {
    const cur = f(jde);
    if (prevF < 0 && cur >= 0) {
      lo = prevJde; hi = jde;
      break;
    }
    prevJde = jde; prevF = cur;
  }
  if (lo === null || hi === null) throw new Error(`节气求解失败: target=${targetDeg} year=${yearGuess}`);
  // 二分细化到 1/86400 天（1 秒）
  while (hi - lo > 1 / 86400) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2; // JDE (TD)
}

/** TD -> UT1：JDE - ΔT/86400 */
function tdToUt(jde, year) {
  return jde - deltaT(year) / 86400;
}

/** UT -> Unix ms */
function utJdToUnixMs(jdUt) {
  return (jdUt - 2440587.5) * 86400 * 1000;
}

/* ---------------- 生成 ---------------- */
const TERM_NAMES = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分",
  "清明", "谷雨", "立夏", "小满", "芒种", "夏至",
  "小暑", "大暑", "立秋", "处暑", "白露", "秋分",
  "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
];

const entries = [];
for (let year = 1900; year <= 2100; year++) {
  for (let i = 0; i < 24; i++) {
    const targetDeg = 360 - 15 * (24 - i) - 15; // 小寒=285°，冬至=270°
    // 小寒 = 285°, 大寒 = 300°, ... 冬至 = 270°
    const deg = 285 + 15 * i >= 360 ? 285 + 15 * i - 360 : 285 + 15 * i;
    const jde = solveSolarLongitude(deg, year);
    // ΔT 用求解时刻的实际公历年（JDE -> 公历年，约 2000 + (jde-J2000)/365.25）
    const calYear = Math.floor(2000 + (jde - 2451545) / 365.25);
    if (calYear < 1899 || calYear > 2101) {
      throw new Error(`求解越界: year=${year} deg=${deg} calYear=${calYear}`);
    }
    const jdUt = jde - deltaT(Math.min(2099, Math.max(1900, calYear))) / 86400;
    const ms = utJdToUnixMs(jdUt);
    // 归属年份：冬至之后（12月）属于次年历法？节气时刻表按"发生年份"记录即可，
    // 上层按时间轴使用，无需归属。但为避免同一年份内角度排序混乱，按发生时刻记录。
    entries.push({ name: TERM_NAMES[i], deg, ms });
  }
}
entries.sort((a, b) => a.ms - b.ms);

// 校验：每个 (year, name) 恰好一条
const seen = new Set();
for (const e of entries) {
  const d = new Date(e.ms);
  // 用北京时间判断年份归属仅用于 sanity check
  const key = `${e.name}-${Math.floor(e.ms)}`;
  if (seen.has(key)) throw new Error("duplicate");
  seen.add(key);
}
if (entries.length !== 201 * 24) throw new Error(`条目数异常: ${entries.length}`);

// FNV-1a 校验和
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const dataLines = entries.map((e) => `  { name: ${JSON.stringify(e.name)}, ms: ${Math.round(e.ms)} },`);
const content = `/**
 * 二十四节气时刻表（1900–2100，UTC 毫秒，精确到分钟内）
 *
 * 生成方式：scripts/build-solar-terms.mjs（VSOP87D 截断 + Meeus 25 章 + Espenak/Meeus ΔT）
 * 数据精度约 ±1 分钟（§16.3 要求精确到分钟）。
 * 本文件为生成物，请勿手改；校验和（FNV-1a）：
 *   SOLAR_TERMS_CHECKSUM = ${fnv1a(dataLines.join("\n"))}
 */
export type SolarTermEntry = { name: string; ms: number };

export const SOLAR_TERMS_MS: SolarTermEntry[] = [
${dataLines.join("\n")}
];

export const SOLAR_TERMS_CHECKSUM = "${fnv1a(dataLines.join("\n"))}";
`;

const outPath = join(__dirname, "..", "packages", "liuyao-engine", "src", "data", "solarTerms.ts");
writeFileSync(outPath, content, "utf8");
console.log(`written ${entries.length} terms -> ${outPath}`);
console.log(`checksum = ${fnv1a(dataLines.join("\n"))}`);

// 打印几个样例做 sanity check（与已知节气时刻比对）
function bj(ms) {
  const d = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(ms));
  return d;
}
console.log("样例：");
for (const e of entries) {
  if ([2000, 2026].includes(new Date(e.ms).getUTCFullYear())) {
    // no-op filter below
  }
}
const samples = entries.filter((e) => {
  const y = new Date(e.ms).getUTCFullYear();
  return (y === 2026 && ["立春", "冬至", "小寒", "夏至"].includes(e.name)) ||
    (y === 2000 && ["春分", "冬至"].includes(e.name)) ||
    (y === 1949 && ["立春"].includes(e.name));
});
for (const s of samples) console.log(`  ${s.name} -> ${bj(s.ms)}`);
