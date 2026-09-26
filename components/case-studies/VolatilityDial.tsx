"use client";

import { useEffect, useRef, useState } from "react";
import { CountUp } from "@/components/shared/CountUp";
import styles from "./case-studies.module.css";

export type VolatilityDialProps = {
  score: number; // 0-100, valore illustrativo del motore
  winRate: number; // 54
  riskReward: string; // "1.4:1"
  reducedMotion: boolean;
  /** Non nel contratto §7 letterale — disclaimer SEMPRE visibile, mai solo tooltip. */
  disclaimer: string;
  locale?: "it" | "en";
  active?: boolean;
  labels: { score: string; winRate: string; riskReward: string; readout: string };
};

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CANDLE_SEED = 20260709;
const CANDLE_COUNT = 16;
/** Altezze seedate: stesso principio "seed fisso" dell'Hero — mai ricalcolate a ogni load. */
const candles = (() => {
  const rand = mulberry32(CANDLE_SEED);
  return Array.from({ length: CANDLE_COUNT }, () => ({
    h: 0.28 + rand() * 0.72,
    hi: rand() < 0.3,
  }));
})();

const SIZE = 148;
const CENTER = SIZE / 2;
const RADIUS = 58;
const ARC_DEGREES = 270;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = (ARC_DEGREES / 360) * CIRCUMFERENCE;
const TICKS = 36;

/** easeInOut ≈ --ease-inout, per il tween in rAF. */
function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Card B — quadrante strumentale: arco 270° con tratto a gradiente e alone aqua,
 * corona di tacche che si accendono fino al valore, mini-candele seedate.
 *
 * Nessun repository, nessun nome di partner/controparte compare qui — né nel
 * testo, né in un href, né in un alt (04-case-studies.md §1 nota, §8).
 */
export function VolatilityDial({
  score,
  winRate,
  riskReward,
  reducedMotion,
  disclaimer,
  locale = "it",
  active = true,
  labels,
}: VolatilityDialProps) {
  const [progress, setProgress] = useState(reducedMotion ? 1 : 0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const stop = () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
    if (reducedMotion || !active) {
      stop();
      // arco già al valore finale sotto reduced motion, azzerato e in attesa
      // quando la card non è in primo piano (§6).
      rafRef.current = requestAnimationFrame(() => setProgress(reducedMotion ? 1 : 0));
      return stop;
    }
    const durationMs = 1400;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setProgress(easeInOut(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return stop;
  }, [reducedMotion, active]);

  const shown = (progress * score) / 100;
  const dashOffset = ARC_LENGTH * (1 - shown);
  const litTicks = Math.round(shown * TICKS);

  return (
    <div className={styles.instrument}>
      <div className={styles.instrumentHead}>
        <span className={styles.readout}>{labels.readout}</span>
        <span className={styles.readout} aria-hidden="true">
          W1 → M1
        </span>
      </div>

      <div className={styles.dialWrap}>
        <div className={styles.dial}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            aria-hidden="true"
            style={{ display: "block", overflow: "visible" }}
          >
            <defs>
              <linearGradient id="cs-dial-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--aqua-600)" />
                <stop offset="55%" stopColor="var(--aqua-400)" />
                <stop offset="100%" stopColor="var(--aqua-200)" />
              </linearGradient>
            </defs>

            {/* corona di tacche */}
            <g transform={`rotate(135 ${CENTER} ${CENTER})`}>
              {Array.from({ length: TICKS + 1 }, (_, i) => {
                const a = (i / TICKS) * ARC_DEGREES;
                const lit = i <= litTicks;
                return (
                  <line
                    key={i}
                    x1={CENTER}
                    y1={CENTER - RADIUS - 11}
                    x2={CENTER}
                    y2={CENTER - RADIUS - (i % 6 === 0 ? 17 : 14)}
                    stroke={lit ? "var(--aqua-400)" : "var(--line)"}
                    strokeWidth={i % 6 === 0 ? 1.4 : 1}
                    strokeLinecap="round"
                    opacity={lit ? 0.9 : 0.5}
                    transform={`rotate(${a} ${CENTER} ${CENTER})`}
                  />
                );
              })}
            </g>

            {/* binario + arco */}
            <g transform={`rotate(135 ${CENTER} ${CENTER})`}>
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="var(--line)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
              />
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="url(#cs-dial-grad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
                style={{ filter: "drop-shadow(0 0 8px rgb(var(--aqua-rgb) / 0.55))" }}
              />
            </g>
          </svg>

          <div className={styles.dialCenter}>
            <span className={styles.dialValue}>
              <CountUp
                from={0}
                to={score}
                durationMs={1400}
                locale={locale}
                reducedMotion={reducedMotion}
                active={active}
              />
            </span>
            <span className={styles.dialCaption}>{labels.score}</span>
          </div>
        </div>

        <div className={styles.dialSide}>
          {/* mini-candele: altezza via scaleY (solo transform, ART-DIRECTION §7) */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 54 }}>
            {candles.map((c, i) => (
              <span
                key={i}
                style={{
                  width: 5,
                  height: `${c.h * 54}px`,
                  borderRadius: 2,
                  background: c.hi
                    ? "linear-gradient(180deg, var(--aqua-200), var(--aqua-500))"
                    : "linear-gradient(180deg, var(--aqua-400), var(--aqua-800))",
                  boxShadow: c.hi ? "0 0 12px -2px rgb(var(--aqua-rgb) / 0.8)" : "none",
                  transformOrigin: "bottom",
                  transform: reducedMotion || active ? "scaleY(1)" : "scaleY(0)",
                  opacity: c.hi ? 1 : 0.7,
                  transition: reducedMotion
                    ? "none"
                    : `transform 350ms var(--ease-out) ${i * 30}ms`,
                }}
              />
            ))}
          </div>

          <p className={styles.heroSub}>
            <span className={styles.num} style={{ color: "var(--text-hi)" }}>
              {labels.winRate} {winRate}%
            </span>
            {" · "}
            <span className={styles.num}>
              {labels.riskReward} {riskReward}
            </span>
          </p>
        </div>
      </div>

      {/* Disclaimer sempre visibile — mai solo in tooltip hover (§8).
          Sta FUORI da .dialSide: dentro la colonna stretta accanto al quadrante
          andava a capo su cinque righe compresse. Qui prende tutta la larghezza
          dello strumento e si legge su una riga (due bilanciate al massimo).
          Solo layout: il testo è quello di content/case-studies.ts, invariato. */}
      <p className={styles.disclaimer}>
        <span aria-hidden="true" className={styles.disclaimerMark} />
        <span>{disclaimer}</span>
      </p>
    </div>
  );
}

export default VolatilityDial;
