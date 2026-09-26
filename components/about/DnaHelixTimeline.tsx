"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap, ensureGsapRegistered } from "@/lib/animation/gsap";
import { Tactile } from "@/components/ui/Tactile";
import { cn } from "@/lib/utils/cn";
import type { AchievementBadge, TimelineEvent, TimelineLane, TimelinePhase } from "@/content/about";
import {
  buildHelixGeometry,
  buildHelixModel,
  helixMetrics,
  HELIX_MAX_WIDTH,
  type HelixGeometry,
  type HelixItem,
  type HelixRow,
  type HelixMetrics,
} from "./helix-geometry";

/* ============================================================================
   07 ABOUT / TRAIETTORIA — doppia elica
   ----------------------------------------------------------------------------
   Riscritta da zero: la v1 campionava un dominio-t sbagliato e produceva due
   RETTE incrociate a X, con solo 2 eventi su 13 visibili e le etichette di
   corsia spinte fuori dal viewport. Qui:

   · la geometria vive in ./helix-geometry.ts (modulo puro, sinusoidi vere
     sfasate di π, traversine con lunghezza proiettata 2A·|sin θ|, profondità
     che governa opacità/spessore/ordine di disegno);
   · le righe sono HTML in flusso normale — si misurano e l'elica ci passa
     attraverso, quindi nessun testo tagliato e nessuno spazio morto;
   · la corsia centrale è larga A + connector, quindi NESSUN box può finire
     sopra un filamento a nessuna y (proprietà per costruzione, non un fix);
   · il disegno progressivo, il reveal dei box e l'accensione delle traversine
     sono pilotati da UN SOLO scrub ScrollTrigger che scrive direttamente sul
     DOM: zero re-render di React durante lo scroll.

   VINCOLO COMUNICATIVO (spec §2, non negoziabile): le due corsie non si
   distinguono MAI per colore. Stesso --aqua-400 per tutto. La distinzione è
   ridondante su tre livelli geometrici: forma del marker (quadrato/rombo),
   icona nella legenda, testo esplicito nella legenda.
   ========================================================================== */

type Locale = "it" | "en";

type DnaHelixTimelineProps = {
  phases: TimelinePhase[];
  events: TimelineEvent[];
  badges: AchievementBadge[];
  locale: Locale;
  reducedMotion: boolean;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * `useLayoutEffect` misura e scrive prima del paint — è ciò che evita il flash
 * di contenuto già rivelato prima che lo scrub lo nasconda. Sul server React
 * avvisa che non fa nulla, quindi lì si degrada a `useEffect`: identità stabile,
 * non è un hook condizionale.
 */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* ---------------------------------------------------------------- icone ---- */

function GraduationCapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 8.5 12 4l10 4.5-10 4.5L2 8.5Z" />
      <path d="M6 10.7V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.3" />
      <path d="M21 9v6" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="m6.5 9.5 3 2.5-3 2.5" />
      <path d="M12.5 14.5h5" />
    </svg>
  );
}

/**
 * Marker di corsia: quadrato pieno (accademico) vs rombo pieno (professionale).
 * Stesso colore, stessa area OTTICA — il rombo è compensato di 1.16× perché a
 * parità di bounding box un quadrato ruotato di 45° si legge più piccolo
 * (checklist spec §9).
 */
function LaneGlyph({ lane, size = 9 }: { lane: TimelineLane; size?: number }) {
  const s = lane === "academic" ? size : size * 1.16;
  const box = size * 1.5;
  return (
    <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-hidden="true" className="dna-glyph">
      <rect
        x={(box - s) / 2}
        y={(box - s) / 2}
        width={s}
        height={s}
        fill="var(--aqua-400)"
        transform={lane === "professional" ? `rotate(45 ${box / 2} ${box / 2})` : undefined}
      />
    </svg>
  );
}

/* --------------------------------------------------------------- schede ---- */

function EventCard({
  item,
  locale,
  side,
  maxWidth,
}: {
  item: Extract<HelixItem, { kind: "event" }>;
  locale: Locale;
  side: "left" | "right";
  maxWidth: number;
}) {
  const e = item.data;
  return (
    <Tactile
      as="div"
      intensity="subtle"
      magnetic
      magneticMax={7}
      tilt3d
      tiltMax={9}
      className={cn("dna-card", side === "left" && "dna-card--left", e.isOngoing && "dna-card--ongoing")}
      style={{ maxWidth, width: "100%" }}
    >
      <span className="dna-card-glyph" aria-hidden="true">
        <LaneGlyph lane={item.lane} />
      </span>
      <span className="dna-card-body">
        <span className="dna-card-title">{e.title[locale]}</span>
        {e.subtitle ? <span className="dna-card-sub">{e.subtitle[locale]}</span> : null}
      </span>
    </Tactile>
  );
}

function BadgeChip({
  item,
  locale,
  side,
  maxWidth,
}: {
  item: Extract<HelixItem, { kind: "badge" }>;
  locale: Locale;
  side: "left" | "right";
  maxWidth: number;
}) {
  const b = item.data;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tipId = `dna-tip-${b.id}`;

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="dna-badge-wrap"
      data-open={open ? "true" : undefined}
      style={{ maxWidth, width: "100%" }}
    >
      <Tactile
        as="button"
        intensity="playful"
        magnetic
        magneticMax={5}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-describedby={tipId}
        className={cn("dna-badge", side === "left" && "dna-badge--left")}
      >
        <span className="dna-badge-dot" aria-hidden="true" />
        <span className="dna-badge-label">{b.label[locale]}</span>
      </Tactile>
      <span id={tipId} role="tooltip" className={cn("dna-tip", side === "left" ? "dna-tip--l" : "dna-tip--r")}>
        {b.detail[locale]}
      </span>
    </div>
  );
}

function Slot({
  item,
  locale,
  side,
  metrics,
}: {
  item: HelixItem;
  locale: Locale;
  side: "left" | "right";
  metrics: HelixMetrics;
}) {
  return item.kind === "event" ? (
    <EventCard item={item} locale={locale} side={side} maxWidth={metrics.boxMax} />
  ) : (
    <BadgeChip item={item} locale={locale} side={side} maxWidth={metrics.boxMax} />
  );
}

/**
 * Una riga della griglia condivisa dalle due corsie.
 *
 * Componente a sé (invece che inline nel map) per due ragioni: i ref callback
 * restano fuori dal corpo di render del contenitore, e la riga si ri-renderizza
 * solo quando cambiano davvero le sue props — durante lo scroll non si
 * ri-renderizza mai, perché il reveal scrive direttamente sul DOM.
 */
function HelixRowView({
  row,
  index,
  gap,
  gridCols,
  metrics,
  locale,
  sideById,
  registerRow,
  registerNode,
}: {
  row: HelixRow;
  index: number;
  gap: number;
  gridCols: string;
  metrics: HelixMetrics;
  locale: Locale;
  sideById: Map<string, "left" | "right">;
  registerRow: (index: number, el: HTMLDivElement | null) => void;
  registerNode: (id: string, el: HTMLDivElement | null) => void;
}) {
  const acad = row.academic;
  const prof = row.professional;
  const acadSide = acad ? (sideById.get(acad.data.id) ?? "left") : "left";
  const profSide = prof ? (sideById.get(prof.data.id) ?? "right") : "right";

  return (
    <div
      ref={(el) => registerRow(index, el)}
      className="dna-row"
      data-phase={row.phaseId}
      data-crossing={row.crossing || undefined}
      style={{ gridTemplateColumns: gridCols, marginTop: gap }}
    >
      {acad ? (
        <div
          ref={(el) => registerNode(acad.data.id, el)}
          className="dna-cell"
          data-lane={acad.lane}
          data-kind={acad.kind}
          style={{
            gridColumn: acadSide === "left" ? 1 : 3,
            justifySelf: acadSide === "left" ? "end" : "start",
            maxWidth: metrics.boxMax,
          }}
        >
          <Slot item={acad} locale={locale} side={acadSide} metrics={metrics} />
        </div>
      ) : null}
      {prof ? (
        <div
          ref={(el) => registerNode(prof.data.id, el)}
          className="dna-cell"
          data-lane={prof.lane}
          data-kind={prof.kind}
          style={{
            gridColumn: profSide === "left" ? 1 : 3,
            justifySelf: profSide === "left" ? "end" : "start",
            maxWidth: metrics.boxMax,
          }}
        >
          <Slot item={prof} locale={locale} side={profSide} metrics={metrics} />
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================================
   Componente principale
   ========================================================================== */

export function DnaHelixTimeline({ phases, events, badges, locale, reducedMotion }: DnaHelixTimelineProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const nodeRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const markRefs = useRef<Map<string, SVGGElement | null>>(new Map());
  const crossRefs = useRef<Map<string, SVGGElement | null>>(new Map());
  const segRefs = useRef<Map<string, SVGPathElement | null>>(new Map());
  const bloomRefs = useRef<Map<string, SVGPathElement | null>>(new Map());
  const clipRef = useRef<SVGRectElement>(null);

  const { rows, phaseMarks } = useMemo(
    () => buildHelixModel(phases, events, badges),
    [phases, events, badges],
  );
  const rowCount = rows.length;

  const ongoingRowIndex = useMemo(() => {
    for (let i = rowCount - 1; i >= 0; i--) {
      const r = rows[i];
      const a = r.academic?.kind === "event" && r.academic.data.isOngoing;
      const p = r.professional?.kind === "event" && r.professional.data.isOngoing;
      if (r.crossing && (a || p)) return i;
    }
    return -1;
  }, [rows, rowCount]);

  const [width, setWidth] = useState(0);
  const [layout, setLayout] = useState<{ rowCenters: number[]; height: number } | null>(null);
  const lastSig = useRef("");

  /**
   * `usePrefersReducedMotion` risponde `false` fino al suo primo effetto (che
   * gira DOPO il paint): per un frame l'elica si nasconderebbe anche a chi ha
   * chiesto di non vedere animazioni. Qui la stessa media query si legge in modo
   * sincrono al primo render client. Non tocca il markup, quindi non può
   * introdurre un mismatch di idratazione.
   */
  const [rmSync] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const reduced = reducedMotion || rmSync;

  const metrics = useMemo(() => helixMetrics(width), [width]);

  const registerRow = useCallback((index: number, el: HTMLDivElement | null) => {
    rowRefs.current[index] = el;
  }, []);
  const registerNode = useCallback((id: string, el: HTMLDivElement | null) => {
    nodeRefs.current.set(id, el);
  }, []);

  /* --- misura: le righe dettano il ritmo, l'elica le insegue ------------- */
  const measure = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w > 0) setWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));

    // Rect relativi al wrapper e non `offsetTop`: il contenitore delle righe è
    // `position: relative` (gli serve per stare sopra l'SVG), quindi sarebbe lui
    // l'offsetParent e le y perderebbero il padding verticale dell'elica.
    const wrapRect = el.getBoundingClientRect();
    const centers: number[] = [];
    for (let i = 0; i < rowCount; i++) {
      const r = rowRefs.current[i];
      if (!r) return;
      const rect = r.getBoundingClientRect();
      centers.push(rect.top - wrapRect.top + rect.height / 2);
    }
    const h = el.offsetHeight;
    const sig = `${w.toFixed(1)}|${h.toFixed(1)}|${centers.map((c) => c.toFixed(1)).join(",")}`;
    if (sig === lastSig.current) return;
    lastSig.current = sig;
    setLayout({ rowCenters: centers, height: h });
  }, [rowCount]);

  useIsoLayoutEffect(() => {
    measure();
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    rowRefs.current.slice(0, rowCount).forEach((r) => r && ro.observe(r));
    return () => ro.disconnect();
  }, [measure, rowCount, width, locale]);

  const geo: HelixGeometry | null = useMemo(() => {
    if (!layout || width <= 0) return null;
    return buildHelixGeometry(rows, layout.rowCenters, layout.height, metrics, ongoingRowIndex);
  }, [rows, layout, width, metrics, ongoingRowIndex]);

  const sideById = useMemo(() => {
    const map = new Map<string, "left" | "right">();
    geo?.anchors.forEach((a) => map.set(a.id, a.side));
    return map;
  }, [geo]);

  /* --- disegno progressivo + reveal, tutto su un solo scrub -------------- */
  useIsoLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!geo || !wrap) return;

    const segs = geo.segments.map((s) => ({ s, el: segRefs.current.get(s.id) ?? null, len: 0 }));
    segs.forEach((x) => {
      if (!x.el) return;
      x.len = x.el.getTotalLength();
      x.el.style.strokeDasharray = `${x.len}`;
    });
    const blooms = geo.bloom.map((b) => ({ el: bloomRefs.current.get(b.lane) ?? null, len: 0 }));
    blooms.forEach((x) => {
      if (!x.el) return;
      x.len = x.el.getTotalLength();
      x.el.style.strokeDasharray = `${x.len}`;
    });

    const apply = (p: number) => {
      for (const x of segs) {
        if (!x.el) continue;
        const local = clamp01((p - x.s.uStart) / Math.max(x.s.uEnd - x.s.uStart, 1e-4));
        x.el.style.strokeDashoffset = `${x.len * (1 - local)}`;
      }
      for (const x of blooms) {
        if (!x.el) continue;
        x.el.style.strokeDashoffset = `${x.len * (1 - p)}`;
      }
      // le traversine si accendono con una singola clip che scende: 1 scrittura
      // invece di ~40, e nessun filtro da ricalcolare.
      clipRef.current?.setAttribute("height", `${Math.max(0, p * geo.height + 20)}`);

      for (const a of geo.anchors) {
        const k = clamp01((p - a.u) / 0.05);
        const node = nodeRefs.current.get(a.id);
        if (node) {
          node.style.opacity = `${k}`;
          // §6.2: i badge entrano in sola dissolvenza, le tappe anche in scala —
          // i badge non devono competere visivamente con le tappe.
          node.style.transform =
            a.kind === "badge"
              ? `translate3d(0, ${(1 - k) * 6}px, 0)`
              : `translate3d(0, ${(1 - k) * 14}px, 0) scale(${0.93 + 0.07 * k})`;
        }
        const g = markRefs.current.get(a.id);
        if (g) g.style.opacity = `${k}`;
      }
      for (const c of geo.crossings) {
        const g = crossRefs.current.get(c.id);
        if (g) g.style.opacity = `${clamp01((p - c.u) / 0.05)}`;
      }
    };

    if (reduced) {
      apply(1);
      return;
    }

    apply(0);
    ensureGsapRegistered();
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1,
      ease: "none",
      scrollTrigger: { trigger: wrap, start: "top 88%", end: "bottom 62%", scrub: 0.5 },
      onUpdate: () => apply(proxy.p),
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      apply(1);
    };
  }, [geo, reduced]);

  /* --- il tratto più vicino al cursore si accende ------------------------ */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!geo || !wrap || reduced) return;

    let raf = 0;
    let cx = 0;
    let cy = 0;
    let active = false;

    const paint = () => {
      raf = 0;
      let px = 0;
      let py = 0;
      if (active) {
        const r = wrap.getBoundingClientRect();
        px = cx - r.left;
        py = cy - r.top;
      }
      const sigma2 = 2 * 120 * 120;
      for (const s of geo.segments) {
        const el = segRefs.current.get(s.id);
        if (!el) continue;
        let w = 0;
        if (active) {
          const dx = s.mid.x - px;
          const dy = s.mid.y - py;
          w = Math.exp(-(dx * dx + dy * dy) / sigma2);
        }
        el.style.opacity = `${Math.min(1, s.opacity + 0.5 * w)}`;
        el.style.strokeWidth = `${s.strokeWidth + 1.9 * w}`;
      }
    };

    const onMove = (e: PointerEvent) => {
      cx = e.clientX;
      cy = e.clientY;
      active = true;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      active = false;
      if (!raf) raf = requestAnimationFrame(paint);
    };

    wrap.addEventListener("pointermove", onMove, { passive: true });
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [geo, reduced]);

  /* ------------------------------------------------------------- render -- */

  const colW = Math.max(60, metrics.cx - metrics.gutter);
  const gridCols = `${colW}px ${metrics.gutter * 2}px ${colW}px`;

  const flat: ({ t: "phase"; id: string; label: TimelinePhase["label"] } | { t: "row"; i: number })[] = [];
  rows.forEach((_, i) => {
    const mark = phaseMarks.find((pm) => pm.beforeRow === i);
    if (mark) flat.push({ t: "phase", id: mark.phaseId, label: mark.label });
    flat.push({ t: "row", i });
  });

  return (
    /* "Più contenuta": l'elica smette di prendersi tutta la larghezza del
       container. Dentro un container da 1280px restavano ~170px di margine
       morto per lato, ed era quel vuoto a farla leggere come un diagramma
       sparso invece che come un oggetto costruito. Tutte le metriche derivano
       dalla larghezza MISURATA, quindi questo unico vincolo riproporziona
       ampiezza, corsia centrale e box insieme. */
    <div className="dna-root" style={{ maxWidth: HELIX_MAX_WIDTH }}>
      <style dangerouslySetInnerHTML={{ __html: HELIX_CSS }} />

      {/* Legenda di corsia — DENTRO il contenitore, centrata: la v1 la spingeva
          fuori dai bordi del viewport. È anche il livello 2+3 della distinzione
          ridondante fra corsie (icona + testo), il livello 1 è la forma del
          marker che si ripete su ogni tappa. */}
      <div className="dna-legend">
        <Tactile as="span" intensity="subtle" className="dna-legend-item">
          <LaneGlyph lane="academic" size={8} />
          <GraduationCapIcon />
          {locale === "it" ? "Percorso accademico" : "Academic track"}
        </Tactile>
        <span className="dna-legend-sep" aria-hidden="true" />
        <Tactile as="span" intensity="subtle" className="dna-legend-item">
          <LaneGlyph lane="professional" size={8} />
          <TerminalIcon />
          {locale === "it" ? "Percorso professionale" : "Professional track"}
        </Tactile>
      </div>
      <p className="dna-legend-note">
        {locale === "it"
          ? "Un solo colore per entrambi: corrono insieme, non uno dopo l'altro."
          : "One colour for both: they run together, not one after the other."}
      </p>

      <div
        ref={wrapRef}
        className="dna-wrap"
        style={{ paddingTop: metrics.padY, paddingBottom: metrics.padY }}
      >
        {geo ? (
          <svg
            className="dna-svg"
            width={metrics.width}
            height={geo.height}
            viewBox={`0 0 ${metrics.width} ${geo.height}`}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <clipPath id={`${uid}-reveal`}>
                <rect ref={clipRef} x={0} y={-10} width={metrics.width} height={geo.height + 20} />
              </clipPath>
              {/* Le code dell'elica sfumano invece di essere tagliate di netto:
                  il filamento "entra" e "esce" dalla sezione. Statico, quindi
                  non ricalcolato durante lo scrub. */}
              <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0" />
                <stop offset={`${Math.min(0.14, (metrics.padY + 6) / geo.height)}`} stopColor="#fff" stopOpacity="1" />
                <stop offset={`${1 - Math.min(0.14, (metrics.padY + 6) / geo.height)}`} stopColor="#fff" stopOpacity="1" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <mask
                id={`${uid}-tails`}
                maskUnits="userSpaceOnUse"
                x={0}
                y={0}
                width={metrics.width}
                height={geo.height}
              >
                <rect x={0} y={0} width={metrics.width} height={geo.height} fill={`url(#${uid}-fade)`} />
              </mask>
            </defs>

            <g mask={`url(#${uid}-tails)`}>
            {/* alone: due tracciati a tutta lunghezza, stroke largo e tenue.
                Costa molto meno di un drop-shadow per ogni sotto-tratto. */}
            <g className="dna-bloom">
              {geo.bloom.map((b) => (
                <path
                  key={b.lane}
                  ref={(el) => {
                    bloomRefs.current.set(b.lane, el);
                  }}
                  d={b.d}
                  fill="none"
                  stroke="var(--aqua-400)"
                  strokeWidth={metrics.compact ? 5 : 8}
                  strokeOpacity={0.1}
                  strokeLinecap="round"
                />
              ))}
            </g>

            {/* Traversine: lunghezza proiettata 2A·|sin θ| ⇒ si accorciano e si
                spengono verso gli incroci. Ognuna è spezzata in DUE metà perché
                i due filamenti hanno profondità complementari: il capo vicino è
                acceso e spesso, quello lontano è spento e sottile, quindi la
                traversina "punta" verso chi guarda. È questo, più della
                sinusoide, a far leggere una rotazione 3D invece di due linee
                ondulate. */}
            <g clipPath={`url(#${uid}-reveal)`} className="dna-rungs">
              {geo.rungs.map((r) => (
                <g key={r.id}>
                  <line
                    x1={r.ax}
                    y1={r.y}
                    x2={r.mx}
                    y2={r.y}
                    stroke="var(--aqua-300)"
                    strokeOpacity={r.aOpacity}
                    strokeWidth={r.aWidth}
                    strokeLinecap="round"
                  />
                  <line
                    x1={r.mx}
                    y1={r.y}
                    x2={r.px}
                    y2={r.y}
                    stroke="var(--aqua-300)"
                    strokeOpacity={r.pOpacity}
                    strokeWidth={r.pWidth}
                    strokeLinecap="round"
                  />
                  {r.cap ? (
                    <circle
                      cx={r.cap.x}
                      cy={r.y}
                      r={1.5}
                      fill="var(--aqua-200)"
                      fillOpacity={r.cap.opacity}
                    />
                  ) : null}
                </g>
              ))}
            </g>

            {/* Filamenti: ordinati per profondità, quello dietro disegnato prima.
                Il TONO — non solo l'alpha — segue la profondità: il tratto che
                gira dietro l'asse vira verso --aqua-600 (spento, profondo),
                quello in primo piano verso --aqua-200 (quasi bianco). Su fondo
                nero la profondità si fa con la luce, non con l'ombra
                (ART-DIRECTION §3, L5). Resta un solo accento: è la stessa rampa
                per entrambe le corsie, quindi non introduce un secondo colore
                per distinguerle (spec §2). */}
            <g className="dna-strands">
              {geo.segments.map((s) => (
                <path
                  key={s.id}
                  ref={(el) => {
                    segRefs.current.set(s.id, el);
                  }}
                  data-lane={s.lane}
                  d={s.d}
                  fill="none"
                  stroke={`color-mix(in oklab, var(--aqua-200) ${(s.depth * 100).toFixed(1)}%, var(--aqua-600))`}
                  strokeLinecap="round"
                  style={{ opacity: s.opacity, strokeWidth: s.strokeWidth }}
                />
              ))}
            </g>
            </g>

            {/* connettori radiali + marker agganciati al filamento */}
            <g>
              {geo.anchors.map((a) => {
                const onCross = Math.abs(a.x - metrics.cx) < 6;
                const mx = onCross ? metrics.cx + (a.side === "left" ? -7 : 7) : a.x;
                return (
                  <g
                    key={a.id}
                    ref={(el) => {
                      markRefs.current.set(a.id, el);
                    }}
                    className="dna-mark"
                    data-lane={a.lane}
                  >
                    {/* Connettore radiale: parte tenue dal filamento e si
                        accende verso il box, così legge come un filo teso e non
                        come un trattino piatto. */}
                    <line
                      x1={mx}
                      y1={a.y}
                      x2={a.edgeX}
                      y2={a.y}
                      stroke="var(--aqua-400)"
                      strokeOpacity={0.16 + 0.22 * a.depth}
                      strokeWidth={0.9}
                    />
                    {/* Alone del marker: il glow è ciò che dà profondità su
                        fondo nero, e segue la profondità del filamento a cui il
                        marker è appeso. */}
                    <circle
                      cx={mx}
                      cy={a.y}
                      r={a.kind === "badge" ? 5.4 : 8}
                      fill="var(--aqua-400)"
                      fillOpacity={0.05 + 0.1 * a.depth}
                    />
                    {a.kind === "badge" ? (
                      <>
                        <circle cx={mx} cy={a.y} r={5.4} fill="none" stroke="var(--aqua-400)" strokeOpacity={0.26 + 0.2 * a.depth} strokeWidth={0.9} />
                        <circle cx={mx} cy={a.y} r={2.7} fill="var(--aqua-200)" fillOpacity={0.6 + 0.4 * a.depth} />
                      </>
                    ) : (
                      /* Quadrato (accademico) vs rombo (professionale), stesso
                         colore e stessa area OTTICA: il rombo è compensato di
                         1.16× (spec §9). È il livello 1 della distinzione
                         ridondante fra corsie — mai il colore. */
                      <rect
                        x={mx - (a.lane === "academic" ? 3.9 : 4.5)}
                        y={a.y - (a.lane === "academic" ? 3.9 : 4.5)}
                        width={a.lane === "academic" ? 7.8 : 9}
                        height={a.lane === "academic" ? 7.8 : 9}
                        fill="var(--aqua-200)"
                        fillOpacity={0.62 + 0.38 * a.depth}
                        transform={a.lane === "professional" ? `rotate(45 ${mx} ${a.y})` : undefined}
                      />
                    )}
                  </g>
                );
              })}

              {geo.crossings.map((c) => (
                <g
                  key={c.id}
                  ref={(el) => {
                    crossRefs.current.set(c.id, el);
                  }}
                  className="dna-mark"
                >
                  {c.ember ? (
                    /* UNICA occorrenza di --ember in questa sezione (ART-DIRECTION §1):
                       il marker "oggi", dove i due percorsi si toccano ancora. */
                    <circle className="dna-oggi" cx={metrics.cx} cy={c.y} r={10} fill="none" stroke="var(--ember)" strokeWidth={1.2} strokeOpacity={0.85} />
                  ) : (
                    <circle cx={metrics.cx} cy={c.y} r={9} fill="none" stroke="var(--aqua-200)" strokeWidth={0.9} strokeOpacity={0.45} />
                  )}
                </g>
              ))}
            </g>
          </svg>
        ) : null}

        <div className="dna-rows">
          {flat.map((entry) =>
            entry.t === "phase" ? (
              <div
                key={`p-${entry.id}`}
                className="dna-phase-row"
                style={{ gridTemplateColumns: gridCols }}
              >
                <span className="dna-phase">{entry.label[locale]}</span>
              </div>
            ) : (
              <HelixRowView
                key={rows[entry.i].key}
                row={rows[entry.i]}
                index={entry.i}
                /* Ritmo verticale stretto: l'oggetto deve essere compatto anche
                   in altezza, non solo in larghezza. Le righe di incrocio
                   respirano un po' di più perché lì cadono due box affiancati. */
                gap={
                  entry.i === 0
                    ? 0
                    : rows[entry.i].crossing || rows[entry.i - 1].crossing
                      ? metrics.compact
                        ? 28
                        : 36
                      : metrics.compact
                        ? 14
                        : 18
                }
                gridCols={gridCols}
                metrics={metrics}
                locale={locale}
                sideById={sideById}
                registerRow={registerRow}
                registerNode={registerNode}
              />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   CSS locale della sezione.
   Vive qui e non in app/globals.css perché quel file è condiviso fra sei
   sezioni in lavorazione simultanea: nessuna classe `dna-*` esce da qui.
   Tutti i valori sono token, nessun colore hardcodato oltre alle alpha
   composte su --aqua-rgb.
   ========================================================================== */

const HELIX_CSS = `
.dna-root { --dna-bd: rgba(63,233,204,.16); width: 100%; margin-inline: auto; }

.dna-legend {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
  gap: 10px 26px;
}
.dna-legend-item {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-mono); font-size: 11px; line-height: 1;
  letter-spacing: var(--ls-micro); text-transform: uppercase;
  color: var(--text-low); cursor: default;
  transition: color var(--dur-base) var(--ease-out);
}
.dna-legend-item:hover { color: var(--text-mid); }
.dna-legend-sep { width: 1px; height: 14px; background: var(--line); }
.dna-legend-note {
  margin: 12px auto 0; text-align: center; max-width: 42ch;
  font-size: 12px; line-height: 1.5; color: var(--text-low);
}

.dna-wrap { position: relative; width: 100%; }
.dna-svg { position: absolute; left: 0; top: 0; pointer-events: none; overflow: visible; }
/* Un solo drop-shadow sul GRUPPO, non uno per tratto: un filtro per path
   costerebbe un layer per ciascuno e l'elica ha ~60 sotto-tratti. Stretto e
   intenso invece che largo e molle — l'alone diffuso lo fa già .dna-bloom. */
.dna-strands { filter: drop-shadow(0 0 3px rgba(63,233,204,.5)); }
.dna-bloom { filter: blur(4px); }
.dna-rows { position: relative; z-index: 1; }

.dna-row, .dna-phase-row { display: grid; align-items: center; }
.dna-phase-row { padding-block: 10px; }
.dna-cell { width: 100%; min-width: 0; }

.dna-phase {
  grid-column: 1; justify-self: start;
  display: inline-flex; align-items: center; gap: 9px;
  font-family: var(--font-mono); font-size: 11px; line-height: 1;
  letter-spacing: var(--ls-micro); text-transform: uppercase; color: var(--text-low);
  white-space: nowrap;
}
.dna-phase::before {
  content: ""; width: 18px; height: 1px; flex: none;
  background: var(--aqua-400); opacity: .6; box-shadow: var(--glow-xs);
}

/* --- tappa: "etichetta appesa al filamento", non una card (spec §2bis) --- */
.dna-card {
  position: relative; display: flex; align-items: flex-start; gap: 9px;
  border-radius: 11px; padding: 10px 12px;
  background: rgba(11,20,26,.34);
  -webkit-backdrop-filter: blur(7px); backdrop-filter: blur(7px);
  border: 1px solid var(--dna-bd);
  box-shadow: inset 0 1px 0 rgba(223,255,248,.04);
  transition: border-color var(--dur-base) var(--ease-out),
              background var(--dur-base) var(--ease-out),
              box-shadow var(--dur-base) var(--ease-out);
}
.dna-card--left { flex-direction: row-reverse; }
.dna-card:hover {
  border-color: rgba(63,233,204,.46);
  background: rgba(17,30,37,.5);
  box-shadow: inset 0 1px 0 rgba(223,255,248,.09), var(--glow-sm);
}
.dna-card--ongoing { border-color: rgba(63,233,204,.3); }
.dna-card-glyph { flex: none; margin-top: 2px; line-height: 0; }
.dna-card-body { display: block; min-width: 0; flex: 1 1 auto; }
.dna-card-title {
  display: block; font-family: var(--font-display); font-weight: 500;
  font-size: 13.5px; line-height: 1.25; letter-spacing: -.012em; color: var(--text-hi);
  text-wrap: pretty;
}
.dna-card-sub {
  display: block; margin-top: 4px; font-size: 11px; line-height: 1.45;
  color: var(--text-mid); text-wrap: pretty;
}

/* --- badge: marker + etichetta SEMPRE visibile, nessun box (spec §1bis) --- */
.dna-badge-wrap { position: relative; z-index: 1; }
.dna-badge-wrap:hover, .dna-badge-wrap:focus-within, .dna-badge-wrap[data-open="true"] { z-index: 30; }
.dna-badge {
  display: flex; align-items: flex-start; gap: 7px; width: 100%;
  padding: 3px 2px; border: 0; border-radius: 8px; background: none;
  text-align: left; color: var(--text-mid); cursor: pointer;
  transition: color var(--dur-base) var(--ease-out);
  font: inherit;
}
.dna-badge--left { flex-direction: row-reverse; text-align: right; }
.dna-badge:hover, .dna-badge-wrap[data-open="true"] .dna-badge { color: var(--text-hi); }
.dna-badge-dot {
  flex: none; margin-top: 4px; width: 8px; height: 8px; border-radius: 999px;
  background: var(--aqua-400); box-shadow: 0 0 6px -1px rgba(63,233,204,.5);
  transition: box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out);
}
.dna-badge:hover .dna-badge-dot, .dna-badge-wrap[data-open="true"] .dna-badge-dot {
  box-shadow: 0 0 14px 2px rgba(63,233,204,.6); transform: scale(1.3);
}
.dna-badge-label { font-size: 11px; line-height: 1.35; min-width: 0; text-wrap: pretty; }

.dna-tip {
  position: absolute; top: calc(100% + 9px); width: max-content;
  max-width: min(250px, 72vw); padding: 10px 12px; border-radius: 10px;
  font-size: 11.5px; line-height: 1.5; color: var(--text-mid); text-align: left;
  background: rgba(6,12,16,.94);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  border: 1px solid rgba(63,233,204,.22); box-shadow: var(--shadow-float);
  /* nascosto con opacity e NON con visibility/display: resta nell'albero di
     accessibilità, così aria-describedby del badge ha davvero qualcosa da
     leggere anche quando il tooltip non è aperto. */
  opacity: 0; transform: translateY(-6px) scale(.97);
  transform-origin: top center; pointer-events: none; z-index: 40;
  transition: opacity var(--dur-micro) var(--ease-out),
              transform var(--dur-micro) var(--ease-out);
}
.dna-tip--l { left: 0; }
.dna-tip--r { right: 0; }
.dna-badge-wrap:hover .dna-tip,
.dna-badge-wrap:focus-within .dna-tip,
.dna-badge-wrap[data-open="true"] .dna-tip {
  opacity: 1; transform: translateY(0) scale(1);
}

.dna-oggi { filter: drop-shadow(0 0 9px rgba(255,122,77,.6)); transform-box: fill-box; transform-origin: center; }
@media (prefers-reduced-motion: no-preference) {
  .dna-oggi { animation: dna-oggi-pulse 3.2s var(--ease-inout) infinite; }
}
@keyframes dna-oggi-pulse {
  0%, 100% { opacity: .7; transform: scale(.92); }
  50%      { opacity: 1;  transform: scale(1.06); }
}

@media (max-width: 699px) {
  .dna-card { padding: 9px 11px; border-radius: 10px; gap: 8px; }
  .dna-card-title { font-size: 12.5px; }
  .dna-card-sub { font-size: 10.5px; margin-top: 4px; }
  .dna-badge-label { font-size: 10px; }
  .dna-phase { font-size: 10px; gap: 7px; }
  .dna-phase::before { width: 12px; }
  .dna-legend-item { font-size: 10px; gap: 6px; }
}
`;

export default DnaHelixTimeline;
