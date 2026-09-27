import type { CaseDataMetric } from "@/content/case-studies";
import styles from "./case-studies-mobile.module.css";

/*
 * Strumenti STATICI della variante mobile: SVG/HTML puri, zero JS a runtime,
 * nessun rAF, nessuna libreria di animazione. Stessi dati e stesse etichette
 * delle versioni desktop (DataScatter / VolatilityDial / ComparisonBarChart),
 * disegnati in forma compatta per ~86vw.
 */

/* ------------------------------------------------------------- Card A -- */

/** Punti deterministici (LCG): identici tra SSR e client, nessun mismatch. */
const SCATTER_POINTS = (() => {
  let s = 20260709;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const clusters = [
    { x: 22, y: 30, r: 13, n: 14, hi: false },
    { x: 58, y: 18, r: 11, n: 11, hi: true },
    { x: 84, y: 38, r: 12, n: 12, hi: false },
  ];
  const pts: { x: number; y: number; hi: boolean }[] = [];
  for (const c of clusters) {
    for (let i = 0; i < c.n; i++) {
      const a = rnd() * Math.PI * 2;
      const d = Math.sqrt(rnd()) * c.r;
      pts.push({
        x: c.x + Math.cos(a) * d,
        y: c.y + Math.sin(a) * d * 0.55,
        hi: c.hi,
      });
    }
  }
  return pts;
})();

/** Sulla faccia: nuvola + le due metriche dopo il numero-eroe (che è la prima). */
export function MobileScatter({
  metrics,
  caption,
  readout,
}: {
  metrics: CaseDataMetric[];
  caption: string;
  readout: string;
}) {
  return (
    <div className={styles.instrument}>
      <div className={styles.scatterRow}>
        <svg viewBox="0 0 106 50" className={styles.scatter} aria-hidden="true">
          <line x1="0" y1="49.5" x2="106" y2="49.5" className={styles.axis} />
          {SCATTER_POINTS.map((p, i) => (
            <circle
              key={i}
              cx={p.x.toFixed(2)}
              cy={p.y.toFixed(2)}
              r={p.hi ? 1.35 : 1.05}
              className={p.hi ? styles.dotHi : styles.dot}
            />
          ))}
        </svg>
        <div className={styles.sideCol}>
          <span className={styles.readout}>{readout}</span>
          {metrics.length > 1 && (
            <dl className={styles.metricsStack}>
              {metrics.slice(1, 3).map((m) => (
                <div key={m.label} className={styles.metric}>
                  <dt className={styles.metricLabel}>{m.label}</dt>
                  <dd className={styles.metricValue}>{m.formatted}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
      <p className={styles.caption}>{caption}</p>
    </div>
  );
}

/* ------------------------------------------------------------- Card B -- */

export function MobileDial({
  score,
  winRate,
  riskReward,
  disclaimer,
  labels,
}: {
  score: number;
  winRate: number;
  riskReward: string;
  disclaimer: string;
  labels: {
    score: string;
    winRate: string;
    riskReward: string;
    readout: string;
  };
}) {
  // semicerchio da 180° a 0°, pathLength=100 → la percentuale è la dasharray
  const angle = Math.PI * (1 - score / 100);
  const nx = 50 + Math.cos(angle) * 38;
  const ny = 46 - Math.sin(angle) * 38;
  return (
    <div className={styles.instrument}>
      <div className={styles.dialRow}>
        <div className={styles.dialCol}>
          <svg viewBox="0 0 100 52" className={styles.dial} aria-hidden="true">
            <path
              d="M 12 46 A 38 38 0 0 1 88 46"
              pathLength={100}
              className={styles.dialTrack}
            />
            <path
              d="M 12 46 A 38 38 0 0 1 88 46"
              pathLength={100}
              className={styles.dialValue}
              strokeDasharray={`${score} 100`}
            />
            <circle
              cx={nx.toFixed(2)}
              cy={ny.toFixed(2)}
              r="3"
              className={styles.dialKnob}
            />
            <text
              x="50"
              y="44"
              textAnchor="middle"
              className={styles.dialScore}
            >
              {score}
            </text>
          </svg>
          <p className={styles.caption}>{labels.score}</p>
        </div>
        <div className={styles.sideCol}>
          <span className={styles.readout}>{labels.readout}</span>
          <dl className={styles.dialStats}>
            <div>
              <dt className={styles.metricLabel}>{labels.winRate}</dt>
              <dd className={styles.metricValue}>{winRate}%</dd>
            </div>
            <div>
              <dt className={styles.metricLabel}>{labels.riskReward}</dt>
              <dd className={styles.metricValue}>{riskReward}</dd>
            </div>
          </dl>
        </div>
      </div>
      <p className={styles.disclaimer}>{disclaimer}</p>
    </div>
  );
}

/* ------------------------------------------------------------- Card D -- */

export function MobileBars({
  rows,
  siteLabel,
  industryLabel,
  readout,
}: {
  rows: { metric: string; siteValue: number; industryAvg: number }[];
  siteLabel: string;
  industryLabel: string;
  readout: string;
}) {
  return (
    <div className={styles.instrument}>
      <div className={styles.instrumentHead}>
        <span className={styles.readout}>{readout}</span>
        <span className={styles.legend}>
          <span className={styles.legendSite}>{siteLabel}</span>
          <span className={styles.legendAvg}>{industryLabel}</span>
        </span>
      </div>
      <ul className={styles.bars}>
        {rows.map((r) => (
          <li key={r.metric} className={styles.barRow}>
            <span className={styles.barMetric}>{r.metric}</span>
            <span className={styles.barNums}>
              <strong>{r.siteValue}</strong>
              <span> / {r.industryAvg}</span>
            </span>
            <span className={styles.barTrack} aria-hidden="true">
              <span
                className={styles.barSite}
                style={{ transform: `scaleX(${r.siteValue / 100})` }}
              />
              <span
                className={styles.barAvg}
                style={{ left: `${r.industryAvg}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
