import { NextResponse } from "next/server";
import { ENGINE_VERSION, RULES_VERSION } from "liuyao-engine";
import { readAiConfig } from "@/lib/admin/aiConfig";

export const dynamic = "force-dynamic";

/** GET /api/health（§62） */
export async function GET() {
  const ai = await readAiConfig();
  const aiConfigured =
    ai && ai.enabled && (Boolean(ai.apiKey) || Boolean(process.env.AI_API_KEY));
  return NextResponse.json({
    status: "ok",
    app: "kaiyuan-liuyao",
    engine: "ok",
    engineVersion: ENGINE_VERSION,
    rulesVersion: RULES_VERSION,
    ai: aiConfigured ? "configured" : "unavailable",
  });
}
