"use client";

/** 起卦流程页面（§3 / §4 / §5 / §8） */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildTimeContextFromManualBeijing,
  runDivination,
  type TossResult,
  type TimeContext,
  type DivinationRecord,
  ENGINE_VERSION,
  RULES_VERSION,
} from "liuyao-engine";
import { secureTosses, newId } from "@/lib/random";
import {
  CATEGORIES,
  saveRecord,
  saveSoundPref,
  loadSoundPref,
  type Category,
} from "@/lib/storage";
import CoinToss from "@/components/coin/CoinToss";

type Step = "inquiry" | "confirm" | "tossing" | "assembling";

export default function DivinePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("inquiry");
  const [inquiry, setInquiry] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [gender, setGender] = useState<"male" | "female" | "unset">("unset");
  const [birthDate, setBirthDate] = useState("");
  const [sound, setSound] = useState(false);
  const [timeContext, setTimeContext] = useState<TimeContext | null>(null);
  const [tosses, setTosses] = useState<TossResult[]>([]);

  useEffect(() => {
    setSound(loadSoundPref());
  }, []);

  const lockTime = () => {
    // 起卦时间在点击"开始六次起卦"瞬间锁定（§4.1）
    const nowMs = Date.now();
    const tc = buildTimeContextFromManualBeijing(
      ...beijingYMDHM(nowMs)
    );
    setTimeContext(tc);
  };

  const startTossing = () => {
    lockTime();
    setTosses([]);
    setStep("tossing");
  };

  const handleLineDone = (t: TossResult) => {
    setTosses((prev) => [...prev, t]);
  };

  const handleAllDone = (all: TossResult[]) => {
    if (!timeContext) return;
    setTosses(all);
    setStep("assembling");
    // 装卦动画的序列由结果页续接；这里直接计算并保存
    const categoryValue = (category || "其他") as Category;
    const { chart, analysis } = runDivination({
      tosses: all,
      timeContext,
      category: categoryValue,
      gender,
    });
    const record: DivinationRecord = {
      schemaVersion: 1,
      engineVersion: ENGINE_VERSION,
      rulesVersion: RULES_VERSION,
      id: newId(),
      createdAt: new Date().toISOString(),
      timeContext,
      inquiry: inquiry.trim() || undefined,
      category: categoryValue,
      gender: gender === "unset" ? undefined : gender,
      birthDate: birthDate || undefined,
      tosses: all,
      chart,
      analysis,
    };
    saveRecord(record);
    // 轻量过渡后进入结果页（§8）
    setTimeout(() => {
      router.push(`/result?id=${record.id}`);
    }, 1200);
  };

  const assemblingSteps = useMemo(
    () => [
      "六爻生成",
      "识别本卦",
      "纳甲",
      "六亲",
      "世应",
      "六神",
      "月建 / 日辰",
      "分析",
    ],
    []
  );
  const [assemblingIdx, setAssemblingIdx] = useState(0);

  useEffect(() => {
    if (step !== "assembling") return;
    const timer = setInterval(() => {
      setAssemblingIdx((i) => Math.min(i + 1, assemblingSteps.length - 1));
    }, 150);
    return () => clearInterval(timer);
  }, [step, assemblingSteps.length]);

  if (step === "tossing" && timeContext) {
    return (
      <CoinToss
        timeContext={timeContext}
        soundOn={sound}
        onLineDone={handleLineDone}
        onAllDone={handleAllDone}
      />
    );
  }

  if (step === "assembling") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <ul className="space-y-2">
          {assemblingSteps.map((s, i) => (
            <li
              key={s}
              className={
                i <= assemblingIdx
                  ? "text-[var(--fg)] transition-opacity"
                  : "text-[var(--muted)] opacity-30 transition-opacity"
              }
            >
              {s}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-xl font-semibold mb-6">本次起卦</h1>
        <div className="rounded-lg border border-[var(--border)] p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">所问</span>
            <span>{inquiry.trim() || "未填写"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">类别</span>
            <span>{category || "未选择"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">性别</span>
            <span>{gender === "unset" ? "未填写" : gender === "male" ? "男" : "女"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">出生日期</span>
            <span>{birthDate || "未填写"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">声音</span>
            <span>{sound ? "开启" : "关闭"}</span>
          </div>
          <div className="pt-2 text-xs text-[var(--muted)]">
            起卦时间：点击下方按钮瞬间锁定（北京时间 UTC+8），六次抛掷共用该时间。
          </div>
        </div>
        <button
          onClick={startTossing}
          className="mt-6 w-full h-12 rounded-full bg-[var(--fg)] text-[var(--bg)] tracking-widest hover:opacity-90"
        >
          开始六次起卦
        </button>
        <button
          onClick={() => setStep("inquiry")}
          className="mt-3 w-full text-sm text-[var(--muted)] hover:text-[var(--fg)]"
        >
          返回修改
        </button>
      </div>
    );
  }

  // step === "inquiry"
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-xl font-semibold mb-6">所问（全部可选）</h1>
      <label className="block text-sm text-[var(--muted)] mb-1">所问事项</label>
      <input
        value={inquiry}
        onChange={(e) => setInquiry(e.target.value)}
        maxLength={500}
        placeholder="例如：明天面试能否顺利"
        className="w-full h-10 rounded-md border border-[var(--border)] px-3 text-sm outline-none focus:border-[var(--accent)]"
      />
      <label className="block text-sm text-[var(--muted)] mt-4 mb-1">占问类别</label>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as Category | "")}
        className="w-full h-10 rounded-md border border-[var(--border)] px-3 text-sm bg-white outline-none focus:border-[var(--accent)]"
      >
        <option value="">未选择</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <label className="block text-sm text-[var(--muted)] mt-4 mb-1">性别</label>
      <div className="flex gap-3">
        {(
          [
            ["male", "男"],
            ["female", "女"],
            ["unset", "不填写"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setGender(v)}
            className={`h-9 flex-1 rounded-full border text-sm ${
              gender === v
                ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
                : "border-[var(--border)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="block text-sm text-[var(--muted)] mt-4 mb-1">出生日期</label>
      <input
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        className="w-full h-10 rounded-md border border-[var(--border)] px-3 text-sm outline-none focus:border-[var(--accent)]"
      />
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sound}
          onChange={(e) => {
            setSound(e.target.checked);
            saveSoundPref(e.target.checked);
          }}
        />
        开启掷币声音（默认静音）
      </label>
      <button
        onClick={() => setStep("confirm")}
        className="mt-8 w-full h-12 rounded-full bg-[var(--fg)] text-[var(--bg)] tracking-widest hover:opacity-90"
      >
        下一步
      </button>
    </div>
  );
}

/** 将时间戳转为北京年月日时分（用于手动上下文构造） */
function beijingYMDHM(ms: number): [number, number, number, number, number] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(ms));
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  let hour = get("hour");
  if (hour === 24) hour = 0;
  return [get("year"), get("month"), get("day"), hour, get("minute")];
}
