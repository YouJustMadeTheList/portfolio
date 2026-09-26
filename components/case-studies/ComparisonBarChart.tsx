"use client";

import { useEffect, useState } from "react";
import { CountUp } from "@/components/shared/CountUp";
import styles from "./case-studies.module.css";

export type ComparisonRow = { metric: string; siteValue: number; industryAvg: number };

export type ComparisonBarChartProps = {
  rows: ComparisonRow[]; // 5 righe, valori 0-100
  reducedMotion: boolean;
  /** Non nel contratto §7 letterale — separatore delle migliaia di CountUp. */
  locale?: "it" | "en";
  siteLabel?: string;
  industryLabel?: string;
  active?: boolean;
  readout?: string;
};

/**
 * Card D — barre comparative sito vs media settore.
 *
 * Un solo accento acceso: la barra del sito è un gradiente aqua che emette luce,
 * la media settore resta grigia a bassa opacità (§5.4 — mai un secondo colore
 * acceso). La crescita è animata in `transform: scaleX`, mai in `width`
 * (ART-DIRECTION §7), e i valori sono contatori mono tabulari.
 */
export function ComparisonBarChart({
  rows,
  reducedMotion,
  locale = "it",
  siteLabel = "Locanda Camilla",
  industryLabel,
  active = true,
  readout,
}: ComparisonBarChartProps) {
  const [grown, setGrown] = useState(reducedMotion);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setGrown(reducedMotion || active));
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, active, rows]);

  const industry = industryLabel ?? (locale === "it" ? "Media settore" : "Industry average");

  return (
    <div className={styles.instrument}>
      <div className={styles.instrumentHead}>
        {readout ? <span className={styles.readout}>{readout}</span> : <span />}
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{
                background: "linear-gradient(90deg, var(--aqua-600), var(--aqua-300))",
                boxShadow: "0 0 10px -2px rgb(var(--aqua-rgb) / 0.8)",
              }}
            />
            {siteLabel}
          </span>
          <span className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: "var(--text-low)", opacity: 0.5 }}
            />
            {industry}
          </span>
        </div>
      </div>

      <ul className={styles.rows}>
        {rows.map((row, i) => (
          <li key={row.metric} className={styles.row}>
            <div className={styles.rowHead}>
              <span className={styles.rowMetric}>{row.metric}</span>
              <span className={styles.rowValue}>
                <CountUp
                  from={0}
                  to={row.siteValue}
                  durationMs={500}
                  delayMs={i * 80}
                  locale={locale}
                  reducedMotion={reducedMotion}
                  active={active}
                />
                /100
              </span>
            </div>
            <div className={styles.track}>
              <span
                className={styles.barIndustry}
                style={{
                  width: `${row.industryAvg}%`,
                  transform: grown ? "scaleX(1)" : "scaleX(0)",
                  transition: reducedMotion
                    ? "none"
                    : `transform 500ms var(--ease-out) ${i * 80}ms`,
                }}
              />
              <span
                className={styles.barSite}
                style={{
                  width: `${row.siteValue}%`,
                  transform: grown ? "scaleX(1)" : "scaleX(0)",
                  transition: reducedMotion
                    ? "none"
                    : `transform 500ms var(--ease-out) ${i * 80}ms`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ComparisonBarChart;
