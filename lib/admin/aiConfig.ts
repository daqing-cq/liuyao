import "server-only";

/**
 * AI 配置读写（§54）：/app/data/config/ai.json
 * - 文件权限 0600；容器 umask 0027；启动/读写时校验权限并尝试修正。
 * - GET /api/admin/settings 不回显 apiKey，只返回 apiKeyConfigured。
 * - 保存时 apiKey 留空则保留原值。
 * - 环境变量 AI_API_KEY 作为覆盖项（仅服务端进程可读）。
 */
import { promises as fs } from "node:fs";
import path from "node:path";

export type AiConfig = {
  enabled: boolean;
  provider: "openai-compatible";
  baseUrl: string;
  model: string;
  apiKey?: string;
  sendInquiryToAi?: boolean;
};

export const SEND_INQUIRY_TO_AI_DEFAULT = false;

function configPath(): string {
  return process.env.AI_CONFIG_PATH || path.join(process.cwd(), "data", "config", "ai.json");
}

/** 校验并尝试修正文件权限为 0600（Windows 下 fs.chmod 无效则忽略） */
async function ensurePermissions(p: string): Promise<void> {
  try {
    const st = await fs.stat(p);
    const mode = st.mode & 0o777;
    if (mode !== 0o600) {
      await fs.chmod(p, 0o600).catch(() => undefined);
      console.warn(`[admin] ai.json 权限为 ${mode.toString(8)}，已尝试修正为 600（§54）`);
    }
  } catch {
    /* 文件不存在 */
  }
}

export async function readAiConfig(): Promise<AiConfig | null> {
  try {
    const p = configPath();
    await ensurePermissions(p);
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw) as AiConfig;
  } catch {
    return null;
  }
}

export async function writeAiConfig(next: AiConfig): Promise<void> {
  const p = configPath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(next, null, 2), { mode: 0o600 });
  await ensurePermissions(p);
}

/** 实际调用时使用的配置（含环境变量覆盖 §54-9） */
export function resolveAiConfig(cfg: AiConfig | null): AiConfig | null {
  if (!cfg) return null;
  const envKey = process.env.AI_API_KEY;
  return { ...cfg, apiKey: envKey || cfg.apiKey };
}

/** 脱敏视图（GET settings 返回用） */
export function redact(cfg: AiConfig): Omit<AiConfig, "apiKey"> & { apiKeyConfigured: boolean } {
  const { apiKey, ...rest } = cfg;
  return { ...rest, apiKeyConfigured: Boolean(apiKey || process.env.AI_API_KEY) };
}
