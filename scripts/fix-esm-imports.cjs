// 给 src 下所有 ts 文件的相对导入加 .js 扩展名（ESM 运行时要求；TS 可解析）
const fs = require("fs");
const path = require("path");

function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (p.endsWith(".ts")) {
      let s = fs.readFileSync(p, "utf8");
      const before = s;
      s = s.replace(/(from\s+["'])(\.\.?\/[^"']+?)(["'])/g, (m, a, b, c) => {
        if (b.endsWith(".js") || b.endsWith(".json")) return m;
        return a + b + ".js" + c;
      });
      s = s.replace(/(import\(\s*["'])(\.\.?\/[^"']+?)(["']\s*\))/g, (m, a, b, c) => {
        if (b.endsWith(".js") || b.endsWith(".json")) return m;
        return a + b + ".js" + c;
      });
      if (s !== before) {
        fs.writeFileSync(p, s);
        console.log("fixed", p);
      }
    }
  }
}
walk("packages/liuyao-engine/src");
console.log("done");
