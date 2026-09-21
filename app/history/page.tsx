"use client";

/** 历史记录页（§38）：查看 / 删除 / 清空 / 导出 / 导入 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { DivinationRecord } from "liuyao-engine";
import {
  loadHistory,
  deleteRecord,
  clearHistory,
  exportRecords,
  importRecords,
} from "@/lib/storage";

export default function HistoryPage() {
  const [records, setRecords] = useState<DivinationRecord[]>([]);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => setRecords(loadHistory());

  useEffect(refresh, []);

  const handleExport = () => {
    const blob = new Blob([exportRecords()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kaiyuan-liuyao-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setNotice("导入失败：单文件上限 5MB。");
      return;
    }
    const text = await file.text();
    const result = importRecords(text);
    setNotice(
      `导入完成：成功 ${result.imported} 条，跳过 ${result.skipped} 条` +
        (result.errors.length ? `；${result.errors.join("；")}` : "")
    );
    refresh();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">历史卦象</h1>
        <div className="flex gap-3 text-xs">
          <button onClick={handleExport} className="underline">
            导出 JSON
          </button>
          <button onClick={() => fileRef.current?.click()} className="underline">
            导入 JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => {
              if (confirm("确定清空全部历史？此操作不可恢复。")) {
                clearHistory();
                refresh();
                setNotice("已清空全部历史。");
              }
            }}
            className="underline text-red-600"
          >
            全部清空
          </button>
        </div>
      </div>

      {notice ? (
        <p className="mt-3 rounded border border-[var(--border)] px-3 py-2 text-xs">
          {notice}
        </p>
      ) : null}

      {records.length === 0 ? (
        <p className="mt-12 text-center text-sm text-[var(--muted)]">
          暂无历史记录。历史仅保存在当前浏览器（LocalStorage），完全匿名。
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {records.map((r) => {
            const bj = `${r.timeContext.beijingDate} ${r.timeContext.beijingTime}`;
            return (
              <li
                key={r.id}
                className="rounded-lg border border-[var(--border)] p-3 text-sm flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="truncate">
                    {bj} · {r.category ?? "未分类"}
                    {r.inquiry ? ` · ${r.inquiry}` : ""}
                  </p>
                  <p className="text-xs text-[var(--muted)] truncate">
                    {r.chart.original.name} ·{" "}
                    {r.chart.lines.filter((l) => l.isMoving).length
                      ? `${r.chart.lines.filter((l) => l.isMoving).map((l) => `第${l.position}爻`).join("、")}动`
                      : "静卦"}{" "}
                    · {r.analysis.conclusion.conclusion}
                  </p>
                </div>
                <div className="flex gap-2 text-xs shrink-0">
                  <Link href={`/result?id=${r.id}`} className="underline">
                    查看
                  </Link>
                  <button
                    onClick={() => {
                      deleteRecord(r.id);
                      refresh();
                    }}
                    className="underline text-red-600"
                  >
                    删除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
