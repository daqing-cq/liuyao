import { NextResponse } from "next/server";
import { csrfToken, destroySession, validateSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

/** POST /api/admin/logout（§52） */
export async function POST(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  const sid = parseCookie(cookie, "kyl_admin");
  await destroySession(sid);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("kyl_admin", "", { maxAge: 0, path: "/" });
  res.cookies.set("kyl_admin_csrf", "", { maxAge: 0, path: "/" });
  return res;
}

function parseCookie(cookie: string, name: string): string | undefined {
  for (const part of cookie.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

// 保留 validateSession / csrfToken 引用避免 lint unused（logout 无需校验）
void validateSession;
void csrfToken;
