import { NextResponse } from "next/server";
import {
  readAiConfig,
  redact,
  resolveAiConfig,
  writeAiConfig,
  type AiConfig,
} from "@/lib/admin/aiConfig";
import { validateSession, verifyCsrf } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

function parseCookie(cookie: string, name: string): string | undefined {
  for (const part of cookie.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}

async function auth(req: Request): Promise<boolean> {
  const cookie = req.headers.get("cookie") ?? "";
  const sid = parseCookie(cookie, "kyl_admin");
  if (!(await validateSession(sid))) return false;
  if (req.method === "POST") {
    const token = req.headers.get("x-csrf-token") ?? parseCookie(cookie, "kyl_admin_csrf");
    if (!verifyCsrf(sid, token)) return false;
  }
  return true;
}

/** GET /api/admin/settings：不回显完整 apiKey（§54-2/3） */
export async function GET(req: Request) {
  if (!(await auth(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfg = await readAiConfig();
  if (!cfg) {
    return NextResponse.json({
      enabled: false,
      provider: "openai-compatible",
      baseUrl: "",
      model: "",
      apiKeyConfigured: false,
      sendInquiryToAi: false,
    });
  }
  return NextResponse.json(redact(cfg));
}

/** POST /api/admin/settings：保存配置；apiKey 留空则保留原 key（§54-4） */
export async function POST(req: Request) {
  if (!(await auth(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Partial<AiConfig> & { test?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const current = await readAiConfig();
  const envKey = process.env.AI_API_KEY;
  const next: AiConfig = {
    enabled: Boolean(body.enabled ?? current?.enabled ?? false),
    provider: "openai-compatible",
    baseUrl: String(body.baseUrl ?? current?.baseUrl ?? "").trim(),
    model: String(body.model ?? current?.model ?? "").trim(),
    apiKey:
      body.apiKey && String(body.apiKey).length > 0
        ? String(body.apiKey)
        : current?.apiKey,
    sendInquiryToAi: Boolean(body.sendInquiryToAi ?? current?.sendInquiryToAi ?? false),
  };

  if (body.test) {
    // 测试 AI 连接（§52）：直接用解析后的配置发一次最小请求
    const resolved = resolveAiConfig({ ...next, apiKey: next.apiKey });
    if (!resolved || !resolved.apiKey || !resolved.baseUrl || !resolved.model) {
      return NextResponse.json({ ok: false, error: "配置不完整（Base URL / Model / API Key）" }, { status: 400 });
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const r = await fetch(`${resolved.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resolved.apiKey}`,
        },
        body: JSON.stringify({
          model: resolved.model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 8,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!r.ok) {
        return NextResponse.json({ ok: false, error: `HTTP ${r.status}` }, { status: 200 });
      }
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ ok: false, error: "连接失败或超时" }, { status: 200 });
    }
  }

  await writeAiConfig(next);
  return NextResponse.json(redact(next));
}
