"use client";

/**
 * AI 解读区（§32 / §35 / §36）：
 * 只调用本站 /api/ai/interpret；任何失败都降级为固定提示，不影响排盘与分析。
 */
import { useState } from "react";
import type { DivinationRecord } from "liuyao-engine";

export default function AiSection({ record }: { record: DivinationRecord }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [data, setData] = useState<{
    summary: string;
    overall: string;
    sections: { title: string; content: string; evidence: string[] }[];
    notice: string;
    engineMismatch?: boolean;
  } | null>(null);
  const [errMsg, setErrMsg] = useState("");

  const request = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/ai/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tosses: record.tosses,
          timeContext: record.timeContext,
          inquiry: record.inquiry,
          category: record.category,
          gender: record.gender,
          chart: record.chart,
          analysis: record.analysis,
        }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      const j = await res.json();
      setData(j.interpretation ?? j);
      setState("done");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "请求失败");
      setState("error");
    }
  };

  return (
    <section className="mt-4 rounded-lg border border-[var(--border)] p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">AI 解读（辅助参考）</h2>
        {state === "idle" ? (
          <button
            onClick={request}
            className="text-xs rounded-full border border-[var(--border)] px-3 py-1 hover:border-[var(--accent)]"
          >
            请求解读
          </button>
        ) : null}
      </div>

      {state === "idle" ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          AI 仅基于引擎已完成的规则结果进行自然语言解释，不参与任何计算。
        </p>
      ) : null}

      {state === "loading" ? (
        <p className="mt-2 text-sm text-[var(--muted)]">解读中…</p>
      ) : null}

      {state === "error" ? (
        <div className="mt-2">
          <p className="text-sm">AI 解读暂时不可用</p>
          <p className="text-xs text-[var(--muted)]">{errMsg}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">基础排盘与规则分析不受影响。</p>
          <button onClick={request} className="mt-2 text-xs underline">
            重试
          </button>
        </div>
      ) : null}

      {state === "done" && data ? (
        <div className="mt-2 text-sm">
          {data.engineMismatch ? (
            <p className="mb-2 text-xs text-[var(--accent)]">
              AI 表述与规则结果不一致，以规则结果为准。
            </p>
          ) : null}
          <p>
            整体：<strong>{data.overall}</strong>
          </p>
          {data.sections.map((s, i) => (
            <div key={i} className="mt-3">
              <h3 className="font-medium">
                {i + 1}. {s.title}
              </h3>
              <p className="mt-1 text-[var(--muted)] whitespace-pre-wrap">{s.content}</p>
            </div>
          ))}
          <p className="mt-3 text-xs text-[var(--muted)]">{data.notice}</p>
        </div>
      ) : null}
    </section>
  );
}
