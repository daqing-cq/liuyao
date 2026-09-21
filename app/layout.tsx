import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "开元六爻 · 六爻起卦与排盘",
  description:
    "六爻起卦 · 自动装卦 · 规则分析 · AI 解读。可复核的六爻计算引擎与现代起卦体验。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-[var(--border)]">
          <div className="mx-auto max-w-5xl px-4 h-12 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-wide">
              开元六爻
            </Link>
            <nav className="flex items-center gap-4 text-sm text-[var(--muted)]">
              <Link href="/manual" className="hover:text-[var(--fg)]">
                手动排盘
              </Link>
              <Link href="/history" className="hover:text-[var(--fg)]">
                历史卦象
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--muted)] px-4">
          本站用于传统文化学习与娱乐参考。六爻结果不构成医疗、法律、财务等专业决策建议；重大事项请咨询相关专业人士。
        </footer>
      </body>
    </html>
  );
}
