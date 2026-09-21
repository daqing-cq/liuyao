/**
 * 开元六爻引擎 · 总出口（§9）
 * 纯 TypeScript，不依赖 React / Next.js / DOM / 浏览器 API。
 */
export * from "./types.js";
export type { MonthlyStrength } from "./types.js";
export * from "./core/coin.js";
export * from "./core/hexagram.js";
export * from "./rules/timeContext.js";
export { applyHiddenMoving, applyStrengthAndDayEffect, dayEffectFor, monthlyStrength } from "./rules/strength.js";
export * from "./rules/specialStates.js";
export * from "./rules/useGod.js";
export * from "./analysis/conclusion.js";
export * from "./data/trigrams.js";
export * from "./data/hexagrams.js";
export * from "./data/naJiaTable.js";
export * from "./data/branches.js";
export { SOLAR_TERMS_MS, SOLAR_TERMS_CHECKSUM } from "./data/solarTerms.js";

/**
 * 一次完整调用：tosses + timeContext -> chart（装卦 + 时间状态 + 关系）+ analysis。
 * 同输入字节级一致（键序稳定，序列化方按键名排序，§83-2）。
 */
import type {
  AnalysisResult, ChartResult, InquiryCategory, TossResult, TimeContext,
} from "./types.js";
import { buildChart } from "./core/hexagram.js";
import { applyStrengthAndDayEffect, applyHiddenMoving } from "./rules/strength.js";
import { applyVoidAndMonthBroken } from "./rules/specialStates.js";
import { analyze } from "./analysis/conclusion.js";

export function runDivination(params: {
  tosses: TossResult[];
  timeContext: TimeContext;
  category: InquiryCategory;
  gender?: "male" | "female" | "unset";
  generatedAt?: string;
}): { chart: ChartResult; analysis: AnalysisResult } {
  const chart = buildChart({
    tosses: params.tosses,
    timeContext: params.timeContext,
    generatedAt: params.generatedAt,
  });

  // 状态计算顺序：旬空/月破 -> 旺衰/日辰 -> 暗动/日破（§25 需要旺衰与空破结果）
  applyVoidAndMonthBroken(chart.lines, params.timeContext);
  applyStrengthAndDayEffect(chart.lines, params.timeContext);
  applyHiddenMoving(chart.lines, params.timeContext);

  const analysis = analyze(chart, params.category, params.gender);
  return { chart, analysis };
}
