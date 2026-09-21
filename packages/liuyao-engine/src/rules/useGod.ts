/**
 * 用神系统（§20 / §21）
 *
 * - 按问题类别推荐用神（正式表）。
 * - 多个同类用神全部列出，透明推荐优先级（禁止黑盒评分），用户可切换。
 * - 疾病占双用神：官鬼（病）/ 子孙（药）双轨（§20.4）。
 * - 婚姻占性别未填：提示手动确认，不自动猜（§3.3）。
 * - 用神不上卦：伏神 feature flag 关闭时输出难断提示（§20.3）。
 */
import type {
  ChartResult, Evidence, InquiryCategory, SixRelative,
  UseGodAnalysis, UseGodCandidate, Element,
} from "../types.js";

export const ADVANCED_FUSHEN = false; // §27：第一版伏神 feature flag 关闭

/** 类别 -> 用神六亲（§20.1 正式表） */
export function categoryToRelative(
  category: InquiryCategory,
  gender?: "male" | "female" | "unset"
): { primary: SixRelative | "世爻"; secondary?: SixRelative; genderPrompt?: string } {
  switch (category) {
    case "自己吉凶":
      return { primary: "世爻" };
    case "求财":
      return { primary: "妻财" };
    case "工作/官职":
    case "考试/功名":
      return { primary: "官鬼" };
    case "疾病":
      return { primary: "官鬼", secondary: "子孙" }; // 官鬼为病、子孙为药（§20.4）
    case "婚姻":
      if (gender === "male") return { primary: "妻财" };
      if (gender === "female") return { primary: "官鬼" };
      // 性别未填写：不自动猜（§3.3）
      return {
        primary: gender === undefined ? "妻财" : "妻财",
        genderPrompt: "性别未填写：婚姻用神存在两种取法（男占妻财、女占官鬼），请手动确认。",
      };
    case "寻物":
    case "房屋/车辆/合同/文书":
      return { primary: "父母" };
    case "子女/宠物/医药":
      return { primary: "子孙" };
    case "朋友/竞争/合作":
      return { primary: "兄弟" };
    case "其他":
      return { primary: "世爻" };
  }
}

/** 原神 / 忌神 / 仇神（§21） */
export function yuanJiChou(useGodElement: Element): {
  yuan: Element; ji: Element; chou: Element;
} {
  const shengTo: Record<Element, Element> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  const keTo: Record<Element, Element> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  const yuan = shengTo[useGodElement];  // 生用神者
  const ji = keTo[useGodElement];       // 克用神者
  // 仇神：克原神、生忌神 —— 克 yuan 且生 ji 的五行
  const all: Element[] = ["木", "火", "土", "金", "水"];
  const chou =
    all.find((e) => keTo[e] === yuan && shengTo[e] === ji) ?? "土";
  return { yuan, ji, chou };
}

/** 透明推荐理由（§20.2 推荐优先级，无评分） */
function candidateReasons(c: UseGodCandidate): string[] {
  const r: string[] = [];
  if (c.isMoving) r.push("明动爻（动爻优先于静爻）");
  else if (c.isHiddenMoving) r.push("暗动爻（优先于普通静爻，低于明动）");
  if (c.recommended === false && c.isMoving === false && !c.isHiddenMoving) r.push("静爻");
  if (c.monthStrength === "旺" || c.monthStrength === "相") {
    r.push(`月建${c.monthStrength}（月建旺相优先）`);
  } else {
    r.push(`月建${c.monthStrength}`);
  }
  if (!c.isVoid && !c.isMonthBroken) r.push("不旬空、不月破");
  if (c.isVoid) r.push("旬空");
  if (c.isMonthBroken) r.push("月破");
  if (c.dayEffect === "日生" || c.dayEffect === "日合" || c.dayEffect === "日扶") {
    r.push(`得日助（${c.dayEffect}）`);
  } else {
    r.push(c.dayEffect);
  }
  return r;
}

function toCandidate(chart: ChartResult, position: number): UseGodCandidate | null {
  const line = chart.lines.find((l) => l.position === position);
  if (!line || !line.stem) return null;
  return {
    position,
    relative: line.relative,
    stem: line.stem,
    branch: line.branch,
    element: line.element,
    isMoving: line.isMoving,
    isHiddenMoving: line.isHiddenMoving,
    monthStrength: line.monthStrength,
    isVoid: line.isVoid,
    isMonthBroken: line.isMonthBroken,
    dayEffect: line.dayEffect,
    reasons: [],
    recommended: false,
  };
}

/**
 * 透明推荐排序键（按 §20.2 优先级依次比较；返回负数表示 a 优先）。
 * 无数字评分，仅逐条规则比较。
 */
function compareCandidates(a: UseGodCandidate, b: UseGodCandidate): number {
  const movingScore = (c: UseGodCandidate) => (c.isMoving ? 3 : c.isHiddenMoving ? 2 : 0);
  if (movingScore(a) !== movingScore(b)) return movingScore(b) - movingScore(a);
  const strengthRank: Record<string, number> = { "旺": 4, "相": 3, "休": 2, "囚": 1, "死": 0 };
  const sa = strengthRank[a.monthStrength] ?? 0;
  const sb = strengthRank[b.monthStrength] ?? 0;
  if (sa !== sb) return sb - sa;
  const okState = (c: UseGodCandidate) => (c.isVoid || c.isMonthBroken ? 0 : 1);
  if (okState(a) !== okState(b)) return okState(b) - okState(a);
  const dayRank: Record<string, number> = { "日生": 3, "日合": 3, "日扶": 2, "日平": 1, "日克": 0, "日冲": 0 };
  const da = dayRank[a.dayEffect] ?? 0;
  const db = dayRank[b.dayEffect] ?? 0;
  if (da !== db) return db - da;
  return a.position - b.position; // 仍并列：按爻位从初爻到上爻（§20.2-7）
}

export type UseGodSelection = {
  analysis: UseGodAnalysis;
  candidates: UseGodCandidate[];
};

/** 用神分析主入口 */
export function analyzeUseGod(
  chart: ChartResult,
  category: InquiryCategory,
  gender?: "male" | "female" | "unset"
): UseGodSelection {
  const spec = categoryToRelative(category, gender);
  const evidence: Evidence[] = [];

  const targetRelative = spec.primary === "世爻"
    ? (chart.lines.find((l) => l.shiYing === "世")?.relative ?? "兄弟")
    : spec.primary;
  const byRelative: SixRelative = targetRelative;

  evidence.push({
    ruleId: "USE_GOD_CATEGORY_001",
    title: "取用神",
    statement:
      spec.primary === "世爻"
        ? `占问类别为「${category}」，按规则以世爻为用神。`
        : `占问类别为「${category}」，按规则以${spec.primary}为用神。`,
    sourceType: "handbook",
  });

  if (spec.genderPrompt) {
    evidence.push({
      ruleId: "USE_GOD_MARRIAGE_GENDER",
      title: "婚姻用神性别确认",
      statement: spec.genderPrompt,
      sourceType: "user_selected",
    });
  }

  // 候选收集
  let candidates: UseGodCandidate[] = [];
  if (spec.primary === "世爻") {
    const shiLine = chart.lines.find((l) => l.shiYing === "世");
    if (shiLine && shiLine.stem) {
      const c = toCandidate(chart, shiLine.position);
      if (c) candidates = [c];
    }
  } else {
    candidates = chart.lines
      .filter((l) => l.relative === byRelative)
      .map((l) => toCandidate(chart, l.position))
      .filter((c): c is UseGodCandidate => c !== null);
  }

  // 推荐排序（透明：比较规则即 §20.2 优先级本身）
  const sorted = [...candidates].sort(compareCandidates);
  const best = sorted[0];
  for (const c of sorted) {
    c.reasons = candidateReasons(c);
  }
  if (best) best.recommended = true;

  // 原神/忌神/仇神
  const useElement: Element = best ? best.element : "木";
  const { yuan, ji, chou } = yuanJiChou(useElement);
  const positionsOfElement = (el: Element) =>
    chart.lines.filter((l) => l.element === el).map((l) => l.position);

  const analysis: UseGodAnalysis = {
    category,
    relative: byRelative,
    position: best ? best.position : null,
    element: useElement,
    branch: best?.branch,
    stem: best?.stem,
    yuanShen: { element: yuan, positions: positionsOfElement(yuan) },
    jiShen: { element: ji, positions: positionsOfElement(ji) },
    chouShen: { element: chou, positions: positionsOfElement(chou) },
    monthStrength: best?.monthStrength ?? "休",
    dayEffect: best?.dayEffect ?? "日平",
    isVoid: best?.isVoid ?? false,
    isMonthBroken: best?.isMonthBroken ?? false,
    genderPrompt: spec.genderPrompt,
    evidence,
  };

  // 疾病双用神（§20.4）：官鬼（病）+ 子孙（药）双轨
  if (category === "疾病") {
    const ghost = chart.lines
      .filter((l) => l.relative === "官鬼")
      .map((l) => toCandidate(chart, l.position))
      .filter((c): c is UseGodCandidate => c !== null)
      .sort(compareCandidates)[0];
    const desc = chart.lines
      .filter((l) => l.relative === "子孙")
      .map((l) => toCandidate(chart, l.position))
      .filter((c): c is UseGodCandidate => c !== null)
      .sort(compareCandidates)[0];
    if (ghost) ghost.reasons = candidateReasons(ghost);
    if (desc) desc.reasons = candidateReasons(desc);
    analysis.dualUseGod = { ghost: ghost ?? null, descendant: desc ?? null };
    evidence.push({
      ruleId: "USE_GOD_ILLNESS_DUAL",
      title: "疾病占双用神",
      statement: "疾病占以官鬼为病、子孙为药，双轨分析（§20.4）。",
      sourceType: "handbook",
    });
  }

  // 用神不上卦（§20.3）
  if (!best) {
    analysis.notOnChartPrompt = ADVANCED_FUSHEN
      ? "用神不上卦，请参考伏神规则。"
      : "用神不上卦，需高级伏神规则或手动判断（伏神功能未开启）。基础结论：难断。";
    evidence.push({
      ruleId: "USE_GOD_NOT_ON_CHART",
      title: "用神不上卦",
      statement: analysis.notOnChartPrompt,
      sourceType: "derived",
    });
  }

  return { analysis, candidates: sorted };
}
