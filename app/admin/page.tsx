"use client";

/** Admin 后台（§52 / §53） */
import { useEffect, useState } from "react";

type Settings = {
  enabled: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  apiKeyConfigured: boolean;
  sendInquiryToAi: boolean;
};

export default function AdminPage() {
  const [logged, setLogged] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [testMsg, setTestMsg] = useState("");

  const loadSettings = async () => {
    const r = await fetch("/api/admin/settings");
    if (r.status === 401) {
      setLogged(false);
      return;
    }
    setLogged(true);
    setSettings(await r.json());
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const login = async () => {
    setLoginError("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({ error: "登录失败" }));
      setLoginError(j.error ?? "登录失败");
      return;
    }
    setPassword("");
    await loadSettings();
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setLogged(false);
    setSettings(null);
  };

  const save = async (test = false) => {
    setSavedMsg("");
    setTestMsg("");
    const csrf = getCookie("kyl_admin_csrf");
    const r = await fetch("/api/admin/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrf ?? "",
      },
      body: JSON.stringify({
        test,
        enabled: settings?.enabled ?? false,
        baseUrl: settings?.baseUrl ?? "",
        model: settings?.model ?? "",
        apiKey: apiKey || undefined, // 留空保留原 key（§54-4）
        sendInquiryToAi: settings?.sendInquiryToAi ?? false,
      }),
    });
    const j = await r.json();
    if (test) {
      setTestMsg(j.ok ? "连接成功" : `连接失败：${j.error ?? "未知错误"}`);
    } else {
      setSavedMsg(j.error ? `保存失败：${j.error}` : "已保存");
      if (!j.error) setApiKey("");
      await loadSettings();
    }
  };

  if (logged === null) {
    return <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-[var(--muted)]">加载中…</div>;
  }

  if (!logged) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24">
        <h1 className="text-xl font-semibold text-center mb-6">管理员登录</h1>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="用户名"
          className="w-full h-10 rounded-md border border-[var(--border)] px-3 text-sm mb-3"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          onKeyDown={(e) => e.key === "Enter" && login()}
          className="w-full h-10 rounded-md border border-[var(--border)] px-3 text-sm"
        />
        {loginError ? <p className="mt-2 text-xs text-red-600">{loginError}</p> : null}
        <button
          onClick={login}
          className="mt-4 w-full h-10 rounded-full bg-[var(--fg)] text-[var(--bg)] text-sm"
        >
          登录
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">管理后台</h1>
        <button onClick={logout} className="text-xs underline text-[var(--muted)]">
          退出登录
        </button>
      </div>

      {settings ? (
        <div className="mt-6 space-y-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            />
            启用 AI 解读
          </label>
          <div>
            <label className="block text-[var(--muted)] mb-1">Base URL（OpenAI-compatible）</label>
            <input
              value={settings.baseUrl}
              onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
              placeholder="https://api.deepseek.com"
              className="w-full h-10 rounded-md border border-[var(--border)] px-3"
            />
          </div>
          <div>
            <label className="block text-[var(--muted)] mb-1">Model</label>
            <input
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              placeholder="deepseek-chat"
              className="w-full h-10 rounded-md border border-[var(--border)] px-3"
            />
          </div>
          <div>
            <label className="block text-[var(--muted)] mb-1">
              API Key {settings.apiKeyConfigured ? "（已配置，留空则保留原 Key）" : "（未配置）"}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings.apiKeyConfigured ? "••••••" : "sk-..."}
              className="w-full h-10 rounded-md border border-[var(--border)] px-3"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.sendInquiryToAi}
              onChange={(e) => setSettings({ ...settings, sendInquiryToAi: e.target.checked })}
            />
            将所问文本发送给 AI（默认关闭，§87-2）
          </label>

          <div className="flex gap-3 pt-2">
            <button onClick={() => save(false)} className="flex-1 h-10 rounded-full bg-[var(--fg)] text-[var(--bg)] text-sm">
              保存配置
            </button>
            <button onClick={() => save(true)} className="flex-1 h-10 rounded-full border border-[var(--border)] text-sm">
              测试连接
            </button>
          </div>
          {savedMsg ? <p className="text-xs">{savedMsg}</p> : null}
          {testMsg ? <p className="text-xs">{testMsg}</p> : null}

          <p className="text-xs text-[var(--muted)] pt-4 border-t border-[var(--border)]">
            管理员配置不保存用户卦象。API Key 仅保存在服务器 data/config/ai.json（0600），不会发送到浏览器；也可通过环境变量 AI_API_KEY 覆盖。
          </p>
        </div>
      ) : null}
    </div>
  );
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
