"use client";

/** 结果页（§43 / §30 / §68）：完整装卦 + 四步透明分析 + 可展开依据 + AI 解读 */
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { DivinationRecord, Line } from "liuyao-engine";
import { loadHistory } from "@/lib/storage";
import AiSection from "@/components/ai/AiSection";

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-[var(--muted)]">
          加载中…
        </div>
      }
    >
      <ResultInner />
    </Suspense>
  );
}

function ResultInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const [record, setRecord] = useState<DivinationRecord | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) {
      setMissing(true);
      return;
    }
    const rec = loadHistory().find((r) => r.id === id);
    if (rec) setRecord(rec);
    else setMissing(true);
  }, [id]);

  if (missing) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-[var(--muted)]">
        未找到该卦象（可能已被删除或属于其他浏览器）。
        <div className="mt-4">
          <Link href="/" className="text-[var(--fg)] underline">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  if (!record) {
    return <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-[var(--muted)]">加载中…</div>;
  }

  const { chart, analysis } = record;
  const tc = chart.timeContext;
  const movingPositions = chart.lines.filter((l) => l.isMoving).map((l) => l.position);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 标题区 */}
      <section className="text-center">
        <h1 className="text-3xl font-semibold tracking-widest">{chart.original.name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {chart.original.palace}宫 · {movingPositions.length ? `${movingPositions.length} 爻动` : "静卦"}
          {chart.changing ? ` · 变卦 ${chart.changing.name}` : " · 变卦：无"}
        </p>
        {record.inquiry ? (
          <p className="mt-2 text-sm">所问：{record.inquiry}</p>
        ) : null}
        {record.category ? (
          <p className="text-xs text-[var(--muted)]">类别：{record.category}</p>
        ) : null}
      </section>

      {/* 时间信息 */}
      <section className="mt-8 rounded-lg border border-[var(--border)] p-4 text-sm">
        <h2 className="font-medium mb-2">时间信息</h2>
        <div className="grid grid-cols-2 gap-y-1 text-[var(--muted)]">
          <span>起卦时间</span>
          <span>{tc.beijingDate} {tc.beijingTime}（北京时间）</span>
          <span>年柱 / 月柱 / 日柱</span>
          <span>{tc.yearGanZhi} / {tc.monthGanZhi} / {tc.dayGanZhi}</span>
          <span>旬空</span>
          <span>{tc.voidBranches.join("、")}（{tc.xun}旬）</span>
          <span>月破</span>
          <span>{tc.monthBrokenBranches.join("、")}</span>
        </div>
      </section>

      {/* 六爻装卦表（§44）：上爻在前 */}
      <section className="mt-4 rounded-lg border border-[var(--border)] p-4 text-sm overflow-x-auto">
        <h2 className="font-medium mb-2">六爻装卦</h2>
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="text-xs text-[var(--muted)]">
              <th className="py-1">六神</th>
              <th>六亲</th>
              <th>干支</th>
              <th>五行</th>
              <th>世应</th>
              <th>动静</th>
              <th>旺衰</th>
            </tr>
          </thead>
          <tbody>
            {[...chart.lines].reverse().map((l) => (
              <tr key={l.position} className="border-t border-[var(--border)]">
                <td className="py-1.5">{l.sixGod}</td>
                <td>{l.relative}</td>
                <td>{l.stem}{l.branch}</td>
                <td>{l.element}</td>
                <td>{l.shiYing ?? ""}</td>
                <td>
                  {l.isMoving ? "动" : l.isHiddenMoving ? "暗动" : l.isDayBroken ? "日破" : "静"}
                  {l.isVoid ? " · 空" : ""}
                  {l.isMonthBroken ? " · 破" : ""}
                  {l.specialMark ? ` · ${l.specialMark}` : ""}
                </td>
                <td>{l.monthStrength} · {l.dayEffect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 用神分析（§30 第①步） */}
      <Section title="① 取用神" evidence={analysis.useGod.evidence}>
        <div className="text-sm space-y-1">
          <p>占问类别：{analysis.useGod.category}</p>
          {analysis.useGod.position ? (
            <p>
              用神：<strong>{analysis.useGod.relative}{analysis.useGod.branch}（{analysis.useGod.element}）</strong>
              ，第 {analysis.useGod.position} 爻
            </p>
          ) : (
            <p className="text-[var(--accent)]">{analysis.useGod.notOnChartPrompt}</p>
          )}
          {analysis.useGod.genderPrompt ? (
            <p className="text-[var(--accent)]">{analysis.useGod.genderPrompt}</p>
          ) : null}
          <p className="text-[var(--muted)]">
            原神：{analysis.useGod.yuanShen.element}（{analysis.useGod.yuanShen.positions.join("、") || "不上卦"}）
            ；忌神：{analysis.useGod.jiShen.element}（{analysis.useGod.jiShen.positions.join("、") || "不上卦"}）
            ；仇神：{analysis.useGod.chouShen.element}（{analysis.useGod.chouShen.positions.join("、") || "不上卦"}）
          </p>
        </div>
      </Section>

      {/* 旺衰（§30 第②步） */}
      <Section title="② 定旺衰" evidence={analysis.useGod.evidence}>
        <p className="text-sm">
          月建 {chart.timeContext.monthBranch}，用神 {analysis.useGod.branch}
          （{analysis.useGod.element}）→ 月建状态：<strong>{analysis.useGod.monthStrength}</strong>
          ；日辰作用：<strong>{analysis.useGod.dayEffect}</strong>
          {analysis.useGod.isVoid ? "；用神旬空" : ""}
          {analysis.useGod.isMonthBroken ? "；用神月破" : ""}
        </p>
      </Section>

      {/* 动爻（§30 第③步） */}
      <Section title="③ 看动爻">
        {analysis.movingLines.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">无动爻。</p>
        ) : (
          <ul className="text-sm space-y-3">
            {analysis.movingLines.map((m) => (
              <li key={m.position}>
                <EvidenceBlock
                  title={`${m.position} 爻 ${m.relative}${m.branch}${m.element}${m.isHiddenMoving ? "（暗动）" : ""}`}
                  lines={[
                    `对用神：${m.actionToUseGod}`,
                    `自身状态：${m.selfStatus}`,
                    `变爻：${m.changedInfo}`,
                    m.returnEffect ? `回头作用：${m.returnEffect}` : "",
                  ].filter(Boolean)}
                  evidence={m.evidence}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* 基础判断（§30 第④步） */}
      <Section title="④ 断吉凶" evidence={analysis.conclusion.evidence}>
        <p className="text-2xl font-semibold text-center py-2">{analysis.conclusion.conclusion}</p>
        <p className="text-sm text-[var(--muted)]">{analysis.conclusion.statement}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">命中规则：{analysis.conclusion.ruleId}</p>
        {analysis.conclusion.conflicts?.length ? (
          <ul className="mt-2 text-xs text-[var(--accent)] list-disc list-inside">
            {analysis.conclusion.conflicts.map((c, i) => (
              <li key={i}>冲突：{c.sideA} ⇄ {c.sideB}</li>
            ))}
          </ul>
        ) : null}
      </Section>

      {/* AI 解读（可选，独立于规则计算） */}
      <AiSection record={record} />

      <p className="mt-8 text-center text-xs text-[var(--muted)]">
        引擎 {chart.engineVersion} · 规则 {chart.rulesVersion} ·{" "}
        <Link href="/history" className="underline">
          返回历史
        </Link>
      </p>
    </div>
  );
}

function Section({
  title,
  children,
  evidence,
}: {
  title: string;
  children: React.ReactNode;
  evidence?: DivinationRecord["analysis"]["conclusion"]["evidence"];
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-4 rounded-lg border border-[var(--border)] p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{title}</h2>
        {evidence && evidence.length > 0 ? (
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-[var(--muted)] hover:text-[var(--fg)]"
            aria-expanded={open}
          >
            ⓘ 判断依据
          </button>
        ) : null}
      </div>
      <div className="mt-2">{children}</div>
      {open && evidence ? (
        <ul className="mt-2 space-y-1 border-t border-[var(--border)] pt-2 text-xs text-[var(--muted)]">
          {evidence.map((e, i) => (
            <li key={i}>
              [{e.ruleId}] {e.statement}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function EvidenceBlock({
  title,
  lines,
  evidence,
}: {
  title: string;
  lines: string[];
  evidence: DivinationRecord["analysis"]["conclusion"]["evidence"];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between">
        <strong>{title}</strong>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-[var(--muted)] hover:text-[var(--fg)]"
          aria-expanded={open}
        >
          ⓘ 依据
        </button>
      </div>
      <ul className="text-[var(--muted)] list-inside">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      {open ? (
        <ul className="mt-1 text-xs text-[var(--muted)] border-t border-[var(--border)] pt-1">
          {evidence.map((e, i) => (
            <li key={i}>[{e.ruleId}] {e.statement}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
