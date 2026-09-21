"use client";

/**
 * LocalStorage 历史与设置（§37 / §38 / §87）
 * 完全匿名；写入必须捕获 QuotaExceededError（§38）。
 */
import type { DivinationRecord } from "liuyao-engine";

const HISTORY_KEY = "kaiyuan-liuyao:history:v1";
const SETTINGS_KEY = "kaiyuan-liuyao:settings:v1";
const SOUND_KEY = "kaiyuan-liuyao:sound:v1";

export const CATEGORIES = [
  "自己吉凶",
  "求财",
  "工作/官职",
  "考试/功名",
  "疾病",
  "婚姻",
  "寻物",
  "房屋/车辆/合同/文书",
  "子女/宠物/医药",
  "朋友/竞争/合作",
  "其他",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type DivineInput = {
  inquiry?: string;
  category?: Category;
  gender?: "male" | "female" | "unset";
  birthDate?: string;
};

export function loadHistory(): DivinationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as DivinationRecord[];
  } catch {
    return [];
  }
}

/** 返回错误信息；成功返回 null */
export function saveRecord(record: DivinationRecord): string | null {
  try {
    const records = loadHistory();
    records.unshift(record);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
    return null;
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      return "本地存储空间不足，请清理历史记录后重试。";
    }
    return "保存失败，请重试。";
  }
}

export function deleteRecord(id: string): void {
  const records = loadHistory().filter((r) => r.id !== id);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
}

export function clearHistory(): void {
  window.localStorage.removeItem(HISTORY_KEY);
}

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

/** 导入校验（§38）：app 名、version、schema、tosses 长度、backs 范围 */
export function importRecords(jsonText: string): ImportResult {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    result.errors.push("JSON 解析失败");
    return result;
  }
  if (typeof data !== "object" || data === null) {
    result.errors.push("文件格式不正确");
    return result;
  }
  const obj = data as Record<string, unknown>;
  if (obj["app"] !== "kaiyuan-liuyao") {
    result.errors.push("app 名称不匹配");
    return result;
  }
  if (obj["version"] !== 1) {
    result.errors.push("版本不兼容（version != 1）");
    return result;
  }
  if (!Array.isArray(obj["records"])) {
    result.errors.push("records 不是数组");
    return result;
  }
  const existing = loadHistory();
  const existingIds = new Set(existing.map((r) => r.id));
  for (const raw of obj["records"] as unknown[]) {
    const rec = raw as Record<string, unknown>;
    if (
      typeof rec !== "object" ||
      typeof rec["id"] !== "string" ||
      !Array.isArray(rec["tosses"]) ||
      (rec["tosses"] as unknown[]).length !== 6 ||
      !(rec["tosses"] as Array<Record<string, unknown>>).every(
        (t) => typeof t["backs"] === "number" && t["backs"] >= 0 && t["backs"] <= 3
      ) ||
      typeof rec["createdAt"] !== "string" ||
      isNaN(Date.parse(rec["createdAt"] as string)) ||
      typeof rec["chart"] !== "object" ||
      rec["chart"] === null
    ) {
      result.errors.push("存在不合 schema 的记录，已跳过");
      result.skipped++;
      continue;
    }
    if (existingIds.has(rec["id"] as string)) {
      result.skipped++; // 同 id 默认跳过（§38）
      continue;
    }
    existing.unshift(rec as unknown as DivinationRecord);
    existingIds.add(rec["id"] as string);
    result.imported++;
  }
  if (result.imported > 0) {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
  }
  return result;
}

export function exportRecords(): string {
  const records = loadHistory();
  return JSON.stringify(
    {
      app: "kaiyuan-liuyao",
      version: 1,
      exportedAt: new Date().toISOString(),
      records,
    },
    null,
    2
  );
}

export function loadSoundPref(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SOUND_KEY) === "on";
}

export function saveSoundPref(on: boolean): void {
  window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
}
