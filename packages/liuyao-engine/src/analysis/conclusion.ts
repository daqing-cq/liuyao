/**
 * 动爻分析（§24 / §26）与结论引擎（§29 / §29.1 / §20.4）
 *
 * 结论引擎：有序规则表、首条命中生效（§29.1）；证据链记录 ruleId；
 * 多动爻 / 双用神冲突默认 conservative 输出"难断"并列明双方依据。
 * 禁止数字评分、百分比、AI confidence（§48）。
 */
import type {
  AnalysisResult, ChartResult, ConclusionResult, Evidence,
  InquiryCategory, MovingLineAnalysis, UseGodCandidate, UseGodAnalysis,
} from "../types.js";
import { ENGINE_VERSION, RULES_VERSION } from "../types.js";
import { analyzeUseGod } from "../rules/useGod.js";
import { findBranchRelations } from "../rules/specialStates.js";
import { ke, sheng } from "../data/branches.js";

/** 冲突策略（§20.4 配置项，默认 conservative） */
export let CONFLICT_POLICY: "conservative" | "first_match" = "conservative";
export function setConflictPolicy(p: "conservative" | "first_match"): void {
  CONFLICT_POLICY = p;
}

/** 动爻对用神的作用描述 */
function actionOf(moverElement: string, useGodElement: string): MovingLineAnalysis["actionToUseGod"] {
  const m = moverElement as never;
  const u = useGodElement as never;
  if (m === u) return "扶用神";
  if (sheng(m, u)) return "生用神";
  if (ke(m, u)) return "克用神";
  return "无直接关系";
}

/** 动爻清单（§24） */
export function analyzeMovingLines(
  chart: ChartResult,
  useGod: UseGodAnalysis
): MovingLineAnalysis[] {
  const out: MovingLineAnalysis[] = [];
  for (const line of chart.lines) {
    const active = line.isMoving || line.isHiddenMoving;
    if (!active) continue;
    const isUseGod = useGod.position === line.position;
    const action = isUseGod ? "用神自身" : actionOf(line.element, useGod.element);

    const evidence: Evidence[] = [];
    if (line.isMoving) {
      evidence.push({
        ruleId: `MOVING_${line.position}`,
        title: `${line.position} 爻发动`,
        statement: `${line.position} 爻${line.relative}${line.element}（${line.branch}）为明动爻，${action === "用神自身" ? "即用神" : `对用神${useGod.relative}${useGod.element}构成：${action}`}。`,
        sourceType: "derived",
        relatedLines: [line.position],
      });
    } else {
      evidence.push({
        ruleId: `HIDDEN_${line.position}`,
        title: `${line.position} 爻暗动`,
        statement: `${line.position} 爻${line.relative}${line.element}旺相逢日冲为暗动，可参与生克但强度低于明动（§25）。`,
        sourceType: "derived",
        relatedLines: [line.position],
      });
    }
    if (line.returnEffect) {
      evidence.push({
        ruleId: `RETURN_${line.position}`,
        title: "变爻回头作用",
        statement: `${line.position} 爻动而化${line.changedBranch}（${line.changedElement}），变爻回头${line.returnEffect}（§26）。`,
        sourceType: "derived",
        relatedLines: [line.position],
      });
    }

    out.push({
      position: line.position,
      relative: line.relative,
      element: line.element,
      branch: line.branch,
      actionToUseGod: action,
      selfStatus: `月建${line.monthStrength}、${line.dayEffect}${line.isVoid ? "、旬空" : ""}${line.isMonthBroken ? "、月破" : ""}`,
      changedInfo: line.changedBranch
        ? `化${line.changedBranch}（${line.changedElement}、${line.changedRelative}）`
        : "静爻暗动，无变爻",
      returnEffect: line.returnEffect ?? null,
      isHiddenMoving: line.isHiddenMoving,
      evidence,
    });
  }
  return out.sort((a, b) => a.position - b.position);
}

type RuleOutcome = "吉" | "凶" | "难断" | "吉/平";

type RuleRow = {
  ruleId: string;
  title: string;
  statement: string;
  outcome: RuleOutcome;
  when: (ctx: ConclusionContext) => boolean;
};

type ConclusionContext = {
  useGod: UseGodAnalysis;
  movingLines: MovingLineAnalysis[];
  chart: ChartResult;
};

const strongStates = ["旺", "相"];
const weakStates = ["休", "囚", "死"];

/** 有序规则表（§29）：多条同时命中时首条命中生效（§29.1） */
const RULE_TABLE: RuleRow[] = [
  {
    ruleId: "CONC_NOT_ON_CHART",
    title: "用神不上卦",
    statement: "用神不上卦，需高级伏神规则或手动判断（伏神功能未开启），基础结论难断。",
    outcome: "难断",
    when: (c) => c.useGod.position === null,
  },
  {
    ruleId: "CONC_VOID_OR_BROKEN",
    title: "用神旬空/月破且无解救",
    statement: "用神旬空或月破且无解救，不自动强断，输出难断。",
    outcome: "难断",
    when: (c) => c.useGod.isVoid || c.useGod.isMonthBroken,
  },
  {
    ruleId: "CONC_SELF_STRONG",
    title: "占自身世爻旺相",
    statement: "占自身吉凶且用神为世，世爻旺相，吉；世衰则凶。",
    outcome: "吉",
    when: (c) =>
      c.useGod.category === "自己吉凶" &&
      c.useGod.relative === (c.chart.lines.find((l) => l.shiYing === "世")?.relative ?? "") &&
      strongStates.includes(c.useGod.monthStrength),
  },
  {
    ruleId: "CONC_SELF_WEAK",
    title: "占自身世爻衰弱",
    statement: "占自身吉凶且用神为世，世爻衰弱，凶。",
    outcome: "凶",
    when: (c) =>
      c.useGod.category === "自己吉凶" &&
      c.useGod.relative === (c.chart.lines.find((l) => l.shiYing === "世")?.relative ?? "") &&
      weakStates.includes(c.useGod.monthStrength),
  },
  {
    ruleId: "CONC_WORLD_RETURN_SHENG",
    title: "世爻动化回头生",
    statement: "世爻发动，动化回头生，世爻得变爻生助，吉。",
    outcome: "吉",
    when: (c) => {
      const shi = c.chart.lines.find((l) => l.shiYing === "世");
      return !!shi && !!shi.isMoving && shi.returnEffect === "回头生";
    },
  },
  {
    ruleId: "CONC_WORLD_RETURN_KE",
    title: "世爻动化回头克",
    statement: "世爻发动，动化回头克，世爻受变爻克制，凶。",
    outcome: "凶",
    when: (c) => {
      const shi = c.chart.lines.find((l) => l.shiYing === "世");
      return !!shi && !!shi.isMoving && shi.returnEffect === "回头克";
    },
  },
  {
    ruleId: "CONC_STRONG_YUAN_SHENG",
    title: "用神旺相 + 原神发动生用",
    statement: "用神旺相，原神（或用神自身）发动生助，无忌神动克用，事可成，吉。",
    outcome: "吉",
    when: (c) => {
      if (!strongStates.includes(c.useGod.monthStrength)) return false;
      const jiKe = c.movingLines.some((m) => m.actionToUseGod === "克用神" && m.element === c.useGod.jiShen.element);
      const yuanSheng = c.movingLines.some((m) => m.actionToUseGod === "生用神" && m.element === c.useGod.yuanShen.element);
      return yuanSheng && !jiKe;
    },
  },
  {
    ruleId: "CONC_STRONG_JI_KE_YUAN_ZHI",
    title: "用神旺相 + 忌神动克 + 原神制忌",
    statement: "用神旺相，忌神发动克用，但原神能动制忌或生用，过程有阻，吉。",
    outcome: "吉",
    when: (c) => {
      if (!strongStates.includes(c.useGod.monthStrength)) return false;
      const jiKe = c.movingLines.some((m) => m.actionToUseGod === "克用神" && m.element === c.useGod.jiShen.element);
      const yuanActive = c.movingLines.some(
        (m) => (m.actionToUseGod === "生用神" && m.element === c.useGod.yuanShen.element)
      );
      return jiKe && yuanActive;
    },
  },
  {
    ruleId: "CONC_WEAK_JI_KE",
    title: "用神衰弱 + 忌神发动克用",
    statement: "用神衰弱，忌神发动克用，事难成，凶。",
    outcome: "凶",
    when: (c) => {
      if (!weakStates.includes(c.useGod.monthStrength)) return false;
      return c.movingLines.some((m) => m.actionToUseGod === "克用神" && m.element === c.useGod.jiShen.element);
    },
  },
  {
    ruleId: "CONC_WEAK_YUAN_SHENG",
    title: "用神衰弱 + 动爻生扶用神",
    statement: "用神衰弱，动爻生用或扶用，无忌神动克，费力可成，吉。",
    outcome: "吉",
    when: (c) => {
      if (!weakStates.includes(c.useGod.monthStrength)) return false;
      const jiKe = c.movingLines.some((m) => m.actionToUseGod === "克用神");
      const benefit = c.movingLines.some((m) => m.actionToUseGod === "生用神" || m.actionToUseGod === "扶用神");
      return benefit && !jiKe;
    },
  },
  {
    ruleId: "CONC_STRONG_MOVING_BENEFICIAL",
    title: "用神旺相 + 动爻生扶用神",
    statement: "用神旺相，动爻生用或扶用，无忌神动克，事可成，吉。",
    outcome: "吉",
    when: (c) => {
      if (!strongStates.includes(c.useGod.monthStrength)) return false;
      const jiKe = c.movingLines.some((m) => m.actionToUseGod === "克用神" && m.element === c.useGod.jiShen.element);
      const beneficial = c.movingLines.some((m) => m.actionToUseGod === "生用神" || m.actionToUseGod === "扶用神");
      return beneficial && !jiKe;
    },
  },
  {
    ruleId: "CONC_STRONG_MOVING_KE",
    title: "用神旺相 + 动爻克用神",
    statement: "用神旺相，虽动爻克用，然用神气旺可抗，事有阻而可成，吉。",
    outcome: "吉",
    when: (c) => {
      if (!strongStates.includes(c.useGod.monthStrength)) return false;
      return c.movingLines.some((m) => m.actionToUseGod === "克用神");
    },
  },
  {
    ruleId: "CONC_STRONG_MOVING_NEUTRAL",
    title: "用神旺相 + 动爻无直接关系",
    statement: "用神旺相，动爻与用神无直接生克，按用神自身旺相论，吉/平。",
    outcome: "吉/平",
    when: (c) =>
      strongStates.includes(c.useGod.monthStrength) &&
      c.movingLines.length > 0 &&
      !c.movingLines.some((m) =>
        m.actionToUseGod === "生用神" || m.actionToUseGod === "扶用神" || m.actionToUseGod === "克用神"
      ),
  },
  {
    ruleId: "CONC_STRONG_NO_MOVING",
    title: "用神旺相 + 无动爻",
    statement: "用神旺相而卦中无动爻，吉/平，按用神状态定。",
    outcome: "吉/平",
    when: (c) =>
      strongStates.includes(c.useGod.monthStrength) && c.movingLines.length === 0,
  },
  {
    ruleId: "CONC_WEAK_MOVING_NEUTRAL",
    title: "用神衰弱 + 动爻无直接关系",
    statement: "用神衰弱，动爻与用神无直接生克亦无生助，事难成，凶。",
    outcome: "凶",
    when: (c) => {
      if (!weakStates.includes(c.useGod.monthStrength)) return false;
      if (c.movingLines.length === 0) return false;
      const hasBenefit = c.movingLines.some((m) => m.actionToUseGod === "生用神" || m.actionToUseGod === "扶用神");
      const hasKe = c.movingLines.some((m) => m.actionToUseGod === "克用神" && m.element === c.useGod.jiShen.element);
      // 无生助亦无原神制忌；凡有克用或中性动爻而用神衰弱，按衰断凶
      return !hasBenefit || hasKe;
    },
  },
  {
    ruleId: "CONC_WEAK_NO_MOVING",
    title: "用神衰弱 + 无动爻",
    statement: "用神衰弱且无动爻，保守显示难断。",
    outcome: "难断",
    when: (c) =>
      weakStates.includes(c.useGod.monthStrength) && c.movingLines.length === 0,
  },
];

/** 疾病双用神合成（§20.4） */
function concludeIllnessDual(
  useGod: UseGodAnalysis,
  movingLines: MovingLineAnalysis[]
): { outcome: RuleOutcome; conflicts: { sideA: string; sideB: string }[] } | null {
  if (!useGod.dualUseGod || useGod.position === null) return null;
  const ghost = useGod.dualUseGod.ghost;
  const desc = useGod.dualUseGod.descendant;
  if (!ghost || !desc) return null;

  const ghostLine = [ghost.position].map((p) => movingLines.find((m) => m.position === p));
  const ghostStrong = strongStates.includes(ghost.monthStrength);
  const descStrong = strongStates.includes(desc.monthStrength);
  const descMoving = desc.isMoving;
  const ghostClashWorld = ghostLine.some(Boolean); // 官鬼对世爻作用在 movingLines 中体现

  const badSignal = ghostStrong;
  const goodSignal = (descStrong && descMoving) || (!ghostStrong && (ghost.isVoid || ghost.isMonthBroken));

  if (badSignal && !goodSignal) return { outcome: "凶", conflicts: [] };
  if (goodSignal && !badSignal) return { outcome: "吉", conflicts: [] };
  if (badSignal && goodSignal) {
    return {
      outcome: "难断",
      conflicts: [
        {
          sideA: `官鬼（病）旺相：病势强`,
          sideB: `子孙（药）${descStrong ? "旺" : "衰"}${descMoving ? "发动制鬼" : "安静"}：药力可制`,
        },
      ],
    };
  }
  return null;
}

/** 多动爻合成（§20.4）：生克信号冲突 -> 保守难断 */
function synthesizeMovingSignals(
  useGod: UseGodAnalysis,
  movingLines: MovingLineAnalysis[]
): { hasSheng: boolean; hasKe: boolean; conflicts: { sideA: string; sideB: string }[] } {
  let hasSheng = false;
  let hasKe = false;
  const conflicts: { sideA: string; sideB: string }[] = [];
  for (const m of movingLines) {
    if (m.actionToUseGod === "生用神" || m.actionToUseGod === "扶用神") hasSheng = true;
    if (m.actionToUseGod === "克用神") {
      // 忌神发动但受制：变爻回头克住忌神
      const line = m; // MovingLineAnalysis
      if (line.returnEffect === "回头克" && line.actionToUseGod === "克用神") {
        // 忌神被回头克：视为受制（不计为克用信号）
        conflicts.push({
          sideA: `${m.position} 爻（${m.relative}${m.element}）动克用神`,
          sideB: `但该爻变爻回头克，忌神受制`,
        });
        continue;
      }
      hasKe = true;
    }
  }
  return { hasSheng, hasKe, conflicts };
}

/** 结论引擎主入口（§29 / §29.1） */
export function conclude(
  chart: ChartResult,
  useGod: UseGodAnalysis,
  movingLines: MovingLineAnalysis[]
): ConclusionResult {
  const evidence: Evidence[] = [];
  const ctx: ConclusionContext = { useGod, movingLines, chart };

  // 疾病双用神优先走双轨合成（§20.4）
  if (useGod.category === "疾病" && useGod.dualUseGod) {
    const dual = concludeIllnessDual(useGod, movingLines);
    if (dual) {
      return {
        conclusion: dual.outcome,
        ruleId: "CONC_ILLNESS_DUAL",
        ruleTitle: "疾病双用神合成",
        statement:
          dual.outcome === "难断"
            ? "官鬼（病）与子孙（药）信号冲突，保守输出难断。"
            : `疾病双轨分析结论：${dual.outcome}。`,
        evidence: useGod.evidence,
        conflicts: dual.conflicts.length ? dual.conflicts : undefined,
      };
    }
  }

  // 多动爻合成（§20.4）：生克信号并存且无法按规则排序 -> 难断（conservative）
  if (movingLines.length > 1 && useGod.position !== null) {
    const { hasSheng, hasKe, conflicts } = synthesizeMovingSignals(useGod, movingLines);
    if (hasSheng && hasKe && CONFLICT_POLICY === "conservative") {
      return {
        conclusion: "难断",
        ruleId: "CONC_MULTI_MOVING_CONFLICT",
        ruleTitle: "多动爻生克信号冲突",
        statement: "存在生用与克用动爻并存，且无法按正式规则排序，保守输出难断（CONFLICT_POLICY=conservative）。",
        evidence: movingLines.flatMap((m) => m.evidence),
        conflicts: conflicts.length ? conflicts : undefined,
      };
    }
  }

  // 有序规则表首条命中（§29.1）
  for (const rule of RULE_TABLE) {
    if (rule.when(ctx)) {
      evidence.push({
        ruleId: rule.ruleId,
        title: rule.title,
        statement: rule.statement,
        sourceType: "handbook",
      });
      return {
        conclusion: rule.outcome,
        ruleId: rule.ruleId,
        ruleTitle: rule.title,
        statement: rule.statement,
        evidence: [...useGod.evidence, ...evidence],
      };
    }
  }

  // 兜底：保守
  return {
    conclusion: "难断",
    ruleId: "CONC_FALLBACK",
    ruleTitle: "无规则命中",
    statement: "现有正式规则未覆盖此情形，保守输出难断。",
    evidence: useGod.evidence,
  };
}

/** 完整分析入口：装卦后调用 */
export function analyze(
  chart: ChartResult,
  category: InquiryCategory,
  gender?: "male" | "female" | "unset"
): AnalysisResult {
  const { analysis: useGod, candidates } = analyzeUseGod(chart, category, gender);
  const movingLines = analyzeMovingLines(chart, useGod);
  const relations = findBranchRelations(chart.lines);
  const conclusion = conclude(chart, useGod, movingLines);
  chart.relations = relations;
  chart.useGodCandidates = candidates;
  chart.selectedUseGod = useGod;
  return {
    useGod,
    movingLines,
    relations,
    conclusion,
    engineVersion: ENGINE_VERSION,
    rulesVersion: RULES_VERSION,
  };
}

export type { UseGodCandidate };
