import "server-only";

/**
 * 管理员会话（§53）：
 * - HttpOnly / SameSite=Lax / Secure(生产) cookie；登录成功后轮换 session id。
 * - 会话落地 /app/data 下受限文件（§53-4 方案二），空闲超时 30 分钟、绝对过期 12 小时。
 * - 登录限流 5 次/分钟；连续 5 次失败锁定 15 分钟（提示不含剩余时间）。
 * - CSRF：签名双提交 cookie（HMAC(SESSION_SECRET, sessionId)）。
 * - 生产模式启动校验 SESSION_SECRET（缺失或 <32 位拒绝启动）。
 */
import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_ABS_MS = 12 * 60 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

export function requireSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "SESSION_SECRET 缺失或短于 32 位：生产模式拒绝启动（§53-3）。请设置至少 32 位随机字符串。"
    );
  }
  return s;
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

function sessionsFile(): string {
  return process.env.SESSIONS_FILE || path.join(process.cwd(), "data", "sessions.json");
}

type SessionRecord = {
  sid: string;
  createdAt: number;
  lastSeen: number;
};

async function loadSessions(): Promise<SessionRecord[]> {
  try {
    const raw = await fs.readFile(sessionsFile(), "utf8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const now = Date.now();
    return (arr as SessionRecord[]).filter(
      (s) => now - s.lastSeen < SESSION_IDLE_MS && now - s.createdAt < SESSION_ABS_MS
    );
  } catch {
    return [];
  }
}

async function saveSessions(list: SessionRecord[]): Promise<void> {
  const p = sessionsFile();
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(list, null, 2), { mode: 0o600 });
}

export function signSid(sid: string): string {
  return createHmac("sha256", requireSecret()).update(sid).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function verifyCredentials(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME || "";
  const p = process.env.ADMIN_PASSWORD || "";
  return safeEqual(username, u) && safeEqual(password, p);
}

/* ---------- 登录限流与锁定（内存实现，单实例 §54-10） ---------- */
type RateState = { windowStart: number; count: number; fails: number; lockedUntil: number };
const g = globalThis as unknown as { __kylRate?: RateState };

export function checkRateLimit(): { ok: boolean; locked?: boolean } {
  const now = Date.now();
  const st = (g.__kylRate ??= { windowStart: now, count: 0, fails: 0, lockedUntil: 0 });
  if (st.lockedUntil > now) return { ok: false, locked: true };
  if (now - st.windowStart > 60_000) {
    st.windowStart = now;
    st.count = 0;
  }
  if (st.count >= 5) return { ok: false };
  st.count++;
  return { ok: true };
}

export function recordFailure(): { locked: boolean } {
  const st = (g.__kylRate ??= { windowStart: Date.now(), count: 0, fails: 0, lockedUntil: 0 });
  st.fails++;
  if (st.fails >= MAX_FAILS) {
    st.lockedUntil = Date.now() + LOCK_MS;
    st.fails = 0;
    return { locked: true };
  }
  return { locked: false };
}

/* ---------- 会话 ---------- */
export async function createSession(): Promise<string> {
  const sid = randomBytes(24).toString("hex"); // 登录成功后生成新 id（轮换）
  const now = Date.now();
  const list = await loadSessions();
  list.push({ sid, createdAt: now, lastSeen: now });
  await saveSessions(list);
  return sid;
}

export async function validateSession(sid: string | undefined): Promise<boolean> {
  if (!sid) return false;
  const list = await loadSessions();
  const rec = list.find((s) => s.sid === sid);
  if (!rec) return false;
  const now = Date.now();
  if (now - rec.createdAt > SESSION_ABS_MS || now - rec.lastSeen > SESSION_IDLE_MS) {
    await saveSessions(list.filter((s) => s.sid !== sid));
    return false;
  }
  rec.lastSeen = now;
  await saveSessions(list);
  return true;
}

export async function destroySession(sid: string | undefined): Promise<void> {
  if (!sid) return;
  const list = await loadSessions();
  await saveSessions(list.filter((s) => s.sid !== sid));
}

/** CSRF：签名双提交 cookie */
export function csrfToken(sid: string): string {
  return signSid(sid);
}

export function verifyCsrf(sid: string | undefined, token: string | undefined): boolean {
  if (!sid || !token) return false;
  return safeEqual(token, csrfToken(sid));
}
