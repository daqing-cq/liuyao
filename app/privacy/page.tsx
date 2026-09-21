import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私说明 · 开元六爻",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold mb-6">隐私说明</h1>
      <ul className="list-disc list-inside space-y-3 text-[var(--muted)]">
        <li>普通用户不需要注册，本站没有任何用户账号系统。</li>
        <li>
          卦象默认仅保存在当前浏览器（LocalStorage），服务器不保存用户历史卦象。
        </li>
        <li>
          除管理员会话外，本站不设置任何 Cookie，不含第三方统计或追踪脚本。
        </li>
        <li>
          AI 解读请求默认仅发送卦盘与分析 JSON；是否将所问文本一并发送由站点管理端开关控制。
          若管理员启用了第三方 AI 服务，AI 服务商可能按照其服务条款处理请求数据。
        </li>
        <li>
          AI 请求体在处理完成后即丢弃，不写入日志；日志不记录任何密钥或用户所问文本。
        </li>
        <li>
          「历史卦象」中的导出文件即您的全部数据；删除后服务器没有任何残留可删除。
        </li>
      </ul>
    </div>
  );
}
