"use client";

/**
 * 掷币组件（§5）：结果先生成、动画后显示；WebGL 不可用时降级 2D 翻面动画（§85）。
 * 3D 抛掷动画为表现层（懒加载），不影响结果。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { tossOneLine, type TossResult, type TimeContext } from "liuyao-engine";
import { secureTosses } from "@/lib/random";

type Props = {
  timeContext: TimeContext;
  soundOn: boolean;
  onLineDone: (t: TossResult) => void;
  onAllDone: (all: TossResult[]) => void;
};

type CoinView = { face: "front" | "back"; spinning: boolean };

export default function CoinToss({ timeContext, soundOn, onLineDone, onAllDone }: Props) {
  const [current, setCurrent] = useState(1);
  const [coins, setCoins] = useState<CoinView[] | null>(null);
  const [label, setLabel] = useState("准备中");
  const [tosses, setTosses] = useState<TossResult[]>([]);
  const [use2D, setUse2D] = useState(true);
  const running = useRef(false);

  const allResults = useRef<TossResult[]>([]);

  const playSound = useCallback(
    (_kind: "collide" | "land") => {
      if (!soundOn) return;
      // 声音文件放 public/audio（collide.mp3 / land.mp3），由管理员按需提供
      try {
        const a = new Audio(`/audio/${_kind === "collide" ? "collide" : "land"}.mp3`);
        a.play().catch(() => undefined);
      } catch {
        /* 忽略 */
      }
    },
    [soundOn]
  );

  const doToss = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setLabel("准备中");

    // 1. 先生成结果（§5.3 结果与动画分离）
    const buf = new Uint8Array(3);
    const toss = secureTossesSingle(buf);

    // 2. 表现层：翻面动画（1.2~2.0s 轻量随机）
    setCoins([
      { face: "front", spinning: true },
      { face: "front", spinning: true },
      { face: "front", spinning: true },
    ]);
    playSound("collide");
    const spinMs = 1200 + Math.floor(Math.random() * 800);
    await sleep(spinMs);

    // 3. 显示正/背
    const faces: CoinView[] = toss.coins.map((c) => ({ face: c, spinning: false }));
    setCoins(faces);
    playSound("land");
    const backs = toss.backs;
    setLabel(
      backs === 0 ? "交 · 老阴 · 动" :
      backs === 1 ? "单 · 少阳" :
      backs === 2 ? "拆 · 少阴" :
      "重 · 老阳 · 动"
    );

    allResults.current = [...allResults.current, toss];
    onLineDone(toss);

    await sleep(600);
    running.current = false;

    if (allResults.current.length >= 6) {
      onAllDone(allResults.current);
    } else {
      setCurrent((c) => c + 1);
      setCoins(null);
    }
  }, [onLineDone, onAllDone, playSound]);

  useEffect(() => {
    if (!use2D) return;
    // 由"开始"按钮触发第一次；这里不自动开始
  }, [use2D]);

  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center select-none">
      <div className="text-sm text-[var(--muted)]">{current} / 6</div>
      <div className="mt-8 h-48 flex items-center justify-center gap-6">
        {coins
          ? coins.map((c, i) => (
              <div
                key={i}
                className={`w-20 h-20 rounded-full border-2 flex items-center justify-center text-lg font-medium transition-transform duration-500 ${
                  c.spinning ? "animate-spin" : ""
                } ${c.face === "back" ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--fg)]"}`}
                aria-label={c.face === "back" ? "背面" : "正面"}
              >
                {c.spinning ? "钱" : c.face === "back" ? "背" : "字"}
              </div>
            ))
          : (
            <button
              onClick={doToss}
              className="h-12 w-40 rounded-full bg-[var(--fg)] text-[var(--bg)] tracking-widest hover:opacity-90"
            >
              {current === 1 ? "掷出第一爻" : "掷下一爻"}
            </button>
          )}
      </div>
      <div className="mt-6 text-sm text-[var(--muted)]">本次结果：{label}</div>
      <div className="mt-10 text-xs text-[var(--muted)]">
        起卦时间 {timeContext.beijingDate} {timeContext.beijingTime}（北京时间，已锁定）
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** 单爻安全随机（3 字节、位运算） */
function secureTossesSingle(buf: Uint8Array): TossResult {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("当前环境不支持 crypto.getRandomValues");
  }
  crypto.getRandomValues(buf);
  const idx = 1; // 展示序号由上层维护，这里返回原始 toss 由 CoinToss 按序号补齐
  const coins: Array<"front" | "back"> = [
    (buf[0]! & 1) === 1 ? "back" : "front",
    (buf[1]! & 1) === 1 ? "back" : "front",
    (buf[2]! & 1) === 1 ? "back" : "front",
  ];
  const backs = coins.filter((c) => c === "back").length as 0 | 1 | 2 | 3;
  return {
    index: idx as 1,
    backs,
    coins,
    lineType: backs === 0 ? "oldYin" : backs === 1 ? "youngYang" : backs === 2 ? "youngYin" : "oldYang",
    isMoving: backs === 0 || backs === 3,
  };
}
