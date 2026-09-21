/**
 * 开元六爻引擎 · 公共类型定义
 *
 * 核心防错原则（开发文档 §1.3 / §44 / §89-K）：
 *   - 展示序号 position / TossResult.index 恒为 1..6（1 = 初爻，6 = 上爻）
 *   - 引擎内部数组下标恒为 0..5（0 = 初爻，5 = 上爻），映射关系 array[index - 1]
 *   - 起卦时间强制北京时间 Asia/Shanghai / UTC+8
 */

export type YinYang = "yin" | "yang";

export type Stem =
  | "甲" | "乙" | "丙" | "丁" | "戊"
  | "己" | "庚" | "辛" | "壬" | "癸";

export type Branch =
  | "子" | "丑" | "寅" | "卯" | "辰" | "巳"
  | "午" | "未" | "申" | "酉" | "戌" | "亥";

export type Element = "木" | "火" | "土" | "金" | "水";

export type SixRelative =
  | "父母" | "兄弟" | "子孙" | "妻财" | "官鬼";

export type SixGod =
  | "青龙" | "朱雀" | "勾陈" | "螣蛇" | "白虎" | "玄武";

export type TrigramName =
  | "乾" | "兑" | "离" | "震" | "巽" | "坎" | "艮" | "坤";

export type PalaceName = TrigramName;

export type MonthlyStrength = "旺" | "相" | "休" | "囚" | "死";

export type DayEffect =
  | "日生" | "日克" | "日冲" | "日合" | "日扶" | "日平";

/** 掷币四象（§6 正式映射） */
export type LineType = "oldYin" | "youngYang" | "youngYin" | "oldYang";

/** 问题类别（§3.3） */
export type InquiryCategory =
  | "自己吉凶"
  | "求财"
  | "工作/官职"
  | "考试/功名"
  | "疾病"
  | "婚姻"
  | "寻物"
  | "房屋/车辆/合同/文书"
  | "子女/宠物/医药"
  | "朋友/竞争/合作"
  | "其他";

export type Gender = "male" | "female" | "unset";

/** 规则分层（§66） */
export type RuleLevel = "formal_handbook" | "common_modern" | "advanced_pending";

/** 结论证据链（§31） */
export type Evidence = {
  ruleId: string;
  title: string;
  statement: string;
  sourceType: "handbook" | "common_modern_rule" | "user_selected" | "derived";
  relatedLines?: number[];
};

/**
 * 单次掷币结果（§7 / §46）。
 * index 为展示序号 1..6（初爻 = 1）；引擎数组下标 = index - 1（§89-K 裁决）。
 */
export type TossResult = {
  index: 1 | 2 | 3 | 4 | 5 | 6;
  backs: 0 | 1 | 2 | 3;
  coins: ("front" | "back")[];
  lineType: LineType;
  isMoving: boolean;
};

/** 装卦后的单爻（§46） */
export type Line = {
  position: 1 | 2 | 3 | 4 | 5 | 6;
  backs: 0 | 1 | 2 | 3;
  yinYang: YinYang;
  isMoving: boolean;

  changedYinYang?: YinYang;
  changedBranch?: Branch;
  changedElement?: Element;
  changedRelative?: SixRelative;

  stem?: Stem;
  branch: Branch;
  element: Element;
  relative: SixRelative;
  sixGod: SixGod;
  shiYing: null | "世" | "应";

  monthStrength: MonthlyStrength;
  dayEffect: DayEffect;

  isVoid: boolean;
  isMonthBroken: boolean;
  isHiddenMoving: boolean;
  isDayBroken: boolean;

  /** 特殊标记（§25：空而被冲待确认 / 月破日冲难断） */
  specialMark?: "空而被冲，待确认" | "月破日冲，难断";

  returnEffect?: "回头生" | "回头克" | "比和" | null;
};

/** 时间上下文（§16） */
export type TimeContext = {
  timestamp: string;
  timezone: "Asia/Shanghai";

  beijingDate: string;
  beijingTime: string;

  yearGanZhi: string;
  monthGanZhi: string;
  dayGanZhi: string;

  monthBranch: Branch;
  dayStem: Stem;
  dayBranch: Branch;

  xun: string;
  voidBranches: [Branch, Branch];

  monthBrokenBranches: Branch[];
};

/** 地支关系（§28） */
export type BranchRelation = {
  sourceLine: number;
  targetLine: number;
  relation: "冲" | "合" | "三合" | "三刑" | "六害";
};

/** 用神候选（§20.2） */
export type UseGodCandidate = {
  position: number;
  relative: SixRelative;
  stem: Stem;
  branch: Branch;
  element: Element;
  isMoving: boolean;
  isHiddenMoving: boolean;
  monthStrength: MonthlyStrength;
  isVoid: boolean;
  isMonthBroken: boolean;
  dayEffect: DayEffect;
  /** 透明推荐理由（§20.2 禁止黑盒评分） */
  reasons: string[];
  recommended: boolean;
};

/** 用神分析（§20 / §21 / §22 / §23） */
export type UseGodAnalysis = {
  category: InquiryCategory;
  relative: SixRelative;
  /** 用神所在爻位；不上卦时为 null */
  position: number | null;
  element: Element;
  branch?: Branch;
  stem?: Stem;

  /** 原神 / 忌神 / 仇神五行及对应爻位（§21） */
  yuanShen: { element: Element; positions: number[] };
  jiShen: { element: Element; positions: number[] };
  chouShen: { element: Element; positions: number[] };

  monthStrength: MonthlyStrength;
  dayEffect: DayEffect;
  isVoid: boolean;
  isMonthBroken: boolean;

  /** 疾病占双用神（§20.4）：官鬼（病）与子孙（药）双轨 */
  dualUseGod?: {
    ghost: UseGodCandidate | null;
    descendant: UseGodCandidate | null;
  };

  /** 婚姻占性别未填提示（§3.3 / §20.1） */
  genderPrompt?: string;

  /** 用神不上卦提示（§20.3） */
  notOnChartPrompt?: string;

  evidence: Evidence[];
};

/** 动爻分析（§24） */
export type MovingLineAnalysis = {
  position: number;
  relative: SixRelative;
  element: Element;
  branch: Branch;

  /** 对用神的作用 */
  actionToUseGod:
    | "生用神"
    | "克用神"
    | "扶用神"
    | "无直接关系"
    | "用神自身";

  /** 对世爻的作用（参考信息） */
  actionToWorld?: string;

  selfStatus: string;
  changedInfo: string;
  returnEffect?: "回头生" | "回头克" | "比和" | null;
  isHiddenMoving: boolean;

  evidence: Evidence[];
};

/** 基础结论（§29） */
export type ConclusionResult = {
  conclusion: "吉" | "凶" | "难断" | "吉/平";
  /** 命中的规则 id（有序表首条命中，§29.1） */
  ruleId: string;
  ruleTitle: string;
  statement: string;
  evidence: Evidence[];
  /** 多动爻 / 双用神冲突时列明双方依据（CONFLICT_POLICY = conservative） */
  conflicts?: { sideA: string; sideB: string }[];
};

export type AnalysisResult = {
  useGod: UseGodAnalysis;
  movingLines: MovingLineAnalysis[];
  relations: BranchRelation[];
  conclusion: ConclusionResult;
  rulesVersion: string;
  engineVersion: string;
};

export type ChartResult = {
  engineVersion: string;
  rulesVersion: string;
  generatedAt: string;

  original: {
    name: string;
    palace: string;
    palaceElement: Element;
    upper: TrigramName;
    lower: TrigramName;
  };

  changing?: {
    name: string;
    upper: TrigramName;
    lower: TrigramName;
    lines: Array<{
      position: number;
      branch: Branch;
      element: Element;
      relative: SixRelative;
    }>;
  };

  lines: Line[];

  shiPosition: number;
  yingPosition: number;

  timeContext: TimeContext;

  relations: BranchRelation[];

  useGodCandidates?: UseGodCandidate[];
  selectedUseGod?: UseGodAnalysis;
};

/** AI 结构化输出（§35） */
export type AIInterpretation = {
  summary: string;
  overall: "吉" | "凶" | "难断";
  sections: Array<{
    title: string;
    content: string;
    evidence: string[];
  }>;
  notice: string;
};

/** 完整历史记录（§37） */
export type DivinationRecord = {
  schemaVersion: 1;
  engineVersion: string;
  rulesVersion: string;

  id: string;
  createdAt: string;
  timeContext: TimeContext;
  inquiry?: string;
  category?: InquiryCategory;
  gender?: Gender;
  birthDate?: string;

  tosses: TossResult[];
  chart: ChartResult;
  analysis: AnalysisResult;

  aiInterpretation?: AIInterpretation;
};

export const ENGINE_VERSION = "1.2.0";
export const RULES_VERSION = "1.2.0";
