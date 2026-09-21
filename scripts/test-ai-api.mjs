// 验证：篡改 analysis.conclusion.ruleId 的请求被 400 拒绝
import {
  runDivination,
  buildTimeContextFromManualBeijing,
} from "../packages/liuyao-engine/dist/index.js";

const tosses = [1, 2, 3, 0, 1, 2].map((b, i) => ({
  index: i + 1,
  backs: b,
  coins:
    b === 0 ? ["front", "front", "front"]
    : b === 1 ? ["back", "front", "front"]
    : b === 2 ? ["back", "back", "front"]
    : ["back", "back", "back"],
  lineType: b === 0 ? "oldYin" : b === 1 ? "youngYang" : b === 2 ? "youngYin" : "oldYang",
  isMoving: b === 0 || b === 3,
}));
const tc = buildTimeContextFromManualBeijing(2026, 9, 20, 19, 21);
const { chart, analysis } = runDivination({ tosses, timeContext: tc, category: "求财" });

// 正常请求 -> 503（AI 未配置，属正常降级）
const ok = await fetch("http://localhost:3456/api/ai/interpret", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tosses,
    timeContext: { beijingDate: tc.beijingDate, beijingTime: tc.beijingTime },
    category: "求财",
    chart,
    analysis,
  }),
});
console.log("normal:", ok.status, JSON.stringify(await ok.json()));

// 篡改请求 -> 400
const tampered = {
  ...analysis,
  conclusion: { ...analysis.conclusion, ruleId: "FAKE_RULE" },
};
const bad = await fetch("http://localhost:3456/api/ai/interpret", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tosses,
    timeContext: { beijingDate: tc.beijingDate, beijingTime: tc.beijingTime },
    category: "求财",
    chart,
    analysis: tampered,
  }),
});
console.log("tampered:", bad.status, JSON.stringify(await bad.json()));
