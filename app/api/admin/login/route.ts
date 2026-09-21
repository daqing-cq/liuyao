import { NextResponse } from "next/server";
import {
  checkRateLimit,
  createSession,
  csrfToken,
  recordFailure,
  verifyCredentials,
} from "@/lib/admin/session";

export const dynamic = "force-dynamic";

/** POST /api/admin/login（§53） */
export async function POST(req: Request) {
  const rate = checkRateLimit();
  if (!rate.ok) {
    if (rate.locked) {
      // 锁定信息不提示具体剩余时间（§53-1）
      return NextResponse.json({ error: "尝试次数过多，请稍后再试。" }, { status: 429 });
    }
    return NextResponse.json({ error: "请求过于频繁。" }, { status: 429 });
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { username = "", password = "" } = body;
  if (!verifyCredentials(String(username), String(password))) {
    const { locked } = recordFailure();
    if (locked) {
      return NextResponse.json({ error: "失败次数过多，账户已临时锁定。" }, { status: 429 });
    }
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const sid = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("kyl_admin", sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  res.cookies.set("kyl_admin_csrf", csrfToken(sid), {
    httpOnly: false, // 双提交 cookie 的前端半份
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}
