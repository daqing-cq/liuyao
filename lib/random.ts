"use client";

/**
 * 浏览器端随机（§5.3 / §84）：唯一随机源 crypto.getRandomValues，位运算取 bit。
 */
import { generateTosses } from "liuyao-engine";

export function secureTosses() {
  return generateTosses((buf) => {
    if (typeof crypto === "undefined" || !crypto.getRandomValues) {
      throw new Error("当前环境不支持 crypto.getRandomValues");
    }
    crypto.getRandomValues(buf);
  });
}

export function newId(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
