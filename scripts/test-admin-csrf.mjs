// 带正确 CSRF 保存设置（读取 cookies.txt 中的 sid 与 csrf）
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const raw = readFileSync("cookies.txt", "utf8");
const sid = raw.match(/kyl_admin\t([0-9a-f]+)/)[1];
const csrfLine = raw.match(/kyl_admin_csrf\t([0-9a-f]+)/)[1];
const token = createHmac("sha256", "0123456789abcdef0123456789abcdef0123456789abcdef")
  .update(sid)
  .digest("hex");
console.log("csrf match:", token === csrfLine);

const r = await fetch("http://localhost:3456/api/admin/settings", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: "kyl_admin=" + sid + "; kyl_admin_csrf=" + token,
    "x-csrf-token": token,
  },
  body: JSON.stringify({
    enabled: false,
    baseUrl: "https://api.example.com",
    model: "test-model",
  }),
});
console.log("save status:", r.status, JSON.stringify(await r.json()));

// 再 GET 验证（apiKey 不回显）
const g = await fetch("http://localhost:3456/api/admin/settings", {
  headers: { Cookie: "kyl_admin=" + sid },
});
console.log("get status:", g.status, JSON.stringify(await g.json()));
