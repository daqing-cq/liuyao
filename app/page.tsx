import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-widest">开元六爻</h1>
        <p className="mt-4 text-[var(--muted)]">六爻起卦 · 自动排盘</p>
        <Link
          href="/divine"
          className="mt-10 inline-flex h-12 w-56 items-center justify-center rounded-full bg-[var(--fg)] text-[var(--bg)] text-base tracking-widest hover:opacity-90"
        >
          开始起卦
        </Link>
        <Link
          href="/manual"
          className="mt-6 text-sm text-[var(--muted)] hover:text-[var(--fg)]"
        >
          手动排盘 →
        </Link>
      </section>
      <section className="grid gap-4 pb-16 sm:grid-cols-3 text-sm">
        <div className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="font-medium">起卦随机</h2>
          <p className="mt-2 text-[var(--muted)]">
            浏览器 crypto 安全随机，位运算取 bit，杜绝取模偏差。
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="font-medium">装卦可复核</h2>
          <p className="mt-2 text-[var(--muted)]">
            纳甲、六亲、世应、六神全部数据驱动，可回归测试。
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="font-medium">分析透明</h2>
          <p className="mt-2 text-[var(--muted)]">
            每条结论给出规则依据；AI 只负责解释，不参与计算。
          </p>
        </div>
      </section>
    </div>
  );
}
