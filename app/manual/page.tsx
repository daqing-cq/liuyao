"use client";

/** 手动排盘（§40–§42）：输入 0–3 背面数，生成完整装卦结果 */
import { useMemo, useState } from "react";
import {
  buildTimeContextFromManualBeijing,
  runDivination,
  type InquiryCategory,
  type TossResult,
} from "liuyao-engine";
import { CATEGORIES, type Category } from "@/lib/storage";

const POS = [6, 5, 4, 3, 2, 1]; // 上爻在前输入

export default function ManualPage() {
  const [backs, setBacks] = useState<Record<number, string>>({
    6: "", 5: "", 4: "", 3: "", 2: "", 1: "",
  });
  const [useNow, setUseNow] = useState(true);
  const [dt, setDt] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [result, setResult] = useState<null | {
    name: string;
    changing: string | null;
    conclusion: string;
    statement: string;
    rows: Array<{
      pos: number; god: string; rel: string; gz: string; el: string;
      sy: string; move: string; strength: string; dayEff: string;
    }>;
    timeStr: string;
    useGodLine: string;
  }>(null);
  const [error, setError] = useState("");

  const parseDt = useMemo(() => {
    if (!dt) return null;
    const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!m) return null;
    return {
      y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5],
    };
  }, [dt]);

  const submit = () => {
    setError("");
    const arr: Array<0 | 1 | 2 | 3> = [];
    for (const p of POS) {
      const v = Number(backs[p]);
      if (!Number.isInteger(v) || v < 0 || v > 3) {
        setError("每爻请输入 0 / 1 / 2 / 3（背面数）。");
        return;
      }
      arr.unshift(v as 0 | 1 | 2 | 3); // 输入自上而下 → 存储自下而上
    }
    let tc;
    try {
      if (useNow) {
        const now = new Date();
        const bj = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Shanghai",
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", hour12: false,
        }).formatToParts(now);
        const get = (t: string) => parseInt(bj.find((x) => x.type === t)?.value ?? "0", 10);
        let h = get("hour"); if (h === 24) h = 0;
        tc = buildTimeContextFromManualBeijing(get("year"), get("month"), get("day"), h, get("minute"));
      } else {
        if (!parseDt) {
          setError("请选择北京时间（1900–2100）。");
          return;
        }
        tc = buildTimeContextFromManualBeijing(parseDt.y, parseDt.mo, parseDt.d, parseDt.h, parseDt.mi);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "时间构造失败");
      return;
    }

    const tosses: TossResult[] = arr.map((b, i) => ({
      index: (i + 1) as 1 | 2 | 3 | 4 | 5 | 6,
      backs: b,
      coins:
        b === 0 ? ["front", "front", "front"] :
        b === 1 ? ["back", "front", "front"] :
        b === 2 ? ["back", "back", "front"] :
        ["back", "back", "back"],
      lineType: b === 0 ? "oldYin" : b === 1 ? "youngYang" : b === 2 ? "youngYin" : "oldYang",
      isMoving: b === 0 || b === 3,
    }));

    const { chart, analysis } = runDivination({
      tosses,
      timeContext: tc,
      category: (category || "其他") as InquiryCategory,
    });

    setResult({
      name: chart.original.name,
      changing: chart.changing?.name ?? null,
      conclusion: analysis.conclusion.conclusion,
      statement: analysis.conclusion.statement,
      timeStr: `${tc.beijingDate} ${tc.beijingTime} · ${tc.yearGanZhi}年 ${tc.monthGanZhi}月 ${tc.dayGanZhi}日 · 旬空${tc.voidBranches.join("")} · 月破${tc.monthBrokenBranches.join("")}`,
      useGodLine: analysis.useGod.position
        ? `用神：${analysis.useGod.relative}${analysis.useGod.branch}（${analysis.useGod.element}），第${analysis.useGod.position}爻 · 月${analysis.useGod.monthStrength} · ${analysis.useGod.dayEffect}`
        : analysis.useGod.notOnChartPrompt ?? "用神不上卦",
      rows: [...chart.lines].reverse().map((l) => ({
        pos: l.position,
        god: l.sixGod,
        rel: l.relative,
        gz: `${l.stem}${l.branch}`,
        el: l.element,
        sy: l.shiYing ?? "",
        move: [l.isMoving && "动", l.isHiddenMoving && "暗动", l.isVoid && "空", l.isMonthBroken && "破", l.isDayBroken && "日破"].filter(Boolean).join(" ") || "静",
        strength: l.monthStrength,
        dayEff: l.dayEffect,
      })),
    });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-xl font-semibold">手动排盘</h1>
      <p className="mt-1 text-xs text-[var(--muted)]">
        在现实中用真正的开元通宝起卦，将每爻的背面数（0–3）填入即可。0=三字（老阴·动），1=单背（少阳），2=两背（少阴），3=三背（老阳·动）。
      </p>

      <div className="mt-6 space-y-2">
        {POS.map((p) => (
          <label key={p} className="flex items-center gap-3 text-sm">
            <span className="w-10">{p === 6 ? "上爻" : p === 1 ? "初爻" : `${p}爻`}</span>
            <input
              inputMode="numeric"
              value={backs[p]}
              onChange={(e) => setBacks((b) => ({ ...b, [p]: e.target.value.replace(/[^\d]/g, "").slice(0, 1) }))}
              placeholder="0-3"
              className="h-9 w-20 rounded-md border border-[var(--border)] px-3 outline-none focus:border-[var(--accent)]"
            />
          </label>
        ))}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={useNow} onChange={(e) => setUseNow(e.target.checked)} />
        使用当前北京时间
      </label>
      {!useNow ? (
        <div className="mt-2">
          <input
            type="datetime-local"
            value={dt}
            min="1900-01-01T00:00"
            max="2100-12-31T23:59"
            onChange={(e) => setDt(e.target.value)}
            className="h-9 w-full rounded-md border border-[var(--border)] px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            支持历史北京时间（1900–2100，含夏令时）；23:00 起日柱计入次日。
          </p>
        </div>
      ) : null}

      <label className="mt-4 block text-sm text-[var(--muted)] mb-1">占问类别（可选）</label>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as Category | "")}
        className="w-full h-9 rounded-md border border-[var(--border)] px-2 text-sm bg-white outline-none"
      >
        <option value="">未选择</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

      <button
        onClick={submit}
        className="mt-6 w-full h-12 rounded-full bg-[var(--fg)] text-[var(--bg)] tracking-widest hover:opacity-90"
      >
        生成排盘
      </button>

      {result ? (
        <div className="mt-8 rounded-lg border border-[var(--border)] p-4">
          <h2 className="text-center text-2xl font-semibold tracking-widest">{result.name}</h2>
          <p className="text-center text-xs text-[var(--muted)] mt-1">
            {result.changing ? `变卦：${result.changing}` : "无动爻 · 变卦：无"}
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">{result.timeStr}</p>
          <table className="mt-3 w-full text-center text-xs border-collapse">
            <thead>
              <tr className="text-[var(--muted)]">
                <th className="py-1">六神</th><th>六亲</th><th>干支</th><th>五行</th><th>世应</th><th>动静</th><th>旺衰</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.pos} className="border-t border-[var(--border)]">
                  <td className="py-1.5">{r.god}</td>
                  <td>{r.rel}</td>
                  <td>{r.gz}</td>
                  <td>{r.el}</td>
                  <td>{r.sy}</td>
                  <td>{r.move}</td>
                  <td>{r.strength}·{r.dayEff}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm">{result.useGodLine}</p>
          <p className="mt-3 text-center text-2xl font-semibold">{result.conclusion}</p>
          <p className="text-center text-xs text-[var(--muted)]">{result.statement}</p>
        </div>
      ) : null}
    </div>
  );
}
