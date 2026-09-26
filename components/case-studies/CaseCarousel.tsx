"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useLocale } from "next-intl";
import { gsap } from "@/lib/animation/gsap";
import { useInViewport } from "@/lib/hooks/useInViewport";
import { smoothScrollTo } from "@/components/fx/SmoothScroll";
import { Tactile } from "@/components/ui/Tactile";
import { cn } from "@/lib/utils/cn";
import { CaseCard, type CaseDetailBlock, type CasePosition } from "./CaseCard";
import { DataScatter } from "./DataScatter";
import { VolatilityDial } from "./VolatilityDial";
import { ComparisonBarChart } from "./ComparisonBarChart";
import {
  caseStudiesCopy,
  customComparisonRows,
  fintechDialData,
  resolveCardCopy,
  resolveDataHeadline,
  resolveDataMetrics,
  type CaseCardId,
} from "@/content/case-studies";
import { CASE_A_DETAIL_LEVEL } from "@/content/case-studies-config";
import {
  DRAG_DISTANCE_RATIO,
  DRAG_FULL_RATIO,
  DRAG_VELOCITY_PX_MS,
  computeStageMetrics,
  shortestOffset,
  slotForOffset,
  zIndexForOffset,
  type StageMetrics,
} from "./carouselStage";
import styles from "./case-studies.module.css";

export type CaseCarouselProps = {
  cardIds: CaseCardId[]; // ["data","fintech","edtech","custom"], ordine di navigazione di default
  activeIndex: number;
  onNavigate: (nextIndex: number, direction: "next" | "prev" | "jump") => void;
  reducedMotion: boolean;
};

const DATA_SCATTER_SEED = 20170101;
const STAGE_FALLBACK_HEIGHT = 620;

/**
 * Offset di destinazione di una card, SEMPRE dentro la banda modellata
 * [-len/2, +len/2] di `slotForOffset`.
 *
 * Bug che questa funzione sostituisce: la versione precedente sceglieva il
 * rappresentante di (index - active) mod len più vicino alla posizione
 * corrente, senza alcun vincolo di banda. Su 4 card gli offset derivavano in
 * modo monotono a ogni `next` (-1 → -2 → -3 → -4): dopo tre passi la card
 * ATTIVA arrivava a offset -4, `slotForOffset` la clampava al fondo scena e il
 * primo piano restava VUOTO — nessuna card a z=0. Verificato a schermo: il
 * contatore diceva "04 / 04" mentre davanti restava la card 03.
 *
 * Qui il target è canonico, quindi la card attiva è sempre esattamente 0 e la
 * scena non può derivare. La scelta del segno conta solo per il caso opposto
 * (raw = len/2, le due slot di fondo): si segue il lato su cui la card già si
 * trova, così il movimento naturale (…, -1, -2) non diventa un salto.
 */
function bandOffset(index: number, active: number, len: number, ref: number) {
  const raw = (((index - active) % len) + len) % len;
  if (raw * 2 === len) return ref < 0 ? -raw : raw;
  return raw > len / 2 ? raw - len : raw;
}

/**
 * Rappresentante di `cur` equivalente (modulo len) più vicino a `target`.
 *
 * Serve al wrap: su 4 card, una volta per giro una card deve passare dal fondo
 * di sinistra al lato destro. Interpolare -2 → +1 la farebbe attraversare il
 * primo piano; si "teletrasporta" prima a +2 (equivalente) e poi si tweena
 * +2 → +1. Il salto avviene a |offset| = 2, cioè opacity 0.16 e blur 5px
 * dietro la card in primo piano: non è percepibile.
 */
function wrapNear(cur: number, target: number, len: number) {
  let best = cur;
  for (const c of [cur - len, cur, cur + len]) {
    if (Math.abs(c - target) < Math.abs(best - target)) best = c;
  }
  return best;
}

function roleFor(offset: number): CasePosition {
  const rounded = Math.round(offset);
  if (rounded === 0) return "foreground";
  if (rounded === -1) return "adjacent-prev";
  if (rounded === 1) return "adjacent-next";
  return "hidden";
}

/**
 * Carosello 3D dei case study.
 *
 * Scena (carouselStage.ts): contenitore con `perspective`, card centrate in
 * absolute, posizione = funzione CONTINUA dello scostamento dall'indice attivo.
 * Il drag interpola quella funzione 1:1 col puntatore; il rilascio la tween-a
 * fino all'intero più vicino con un filo di overshoot, che è ciò che dà la
 * sensazione di inerzia fisica. Le laterali arretrano su Z, ruotano su Y, si
 * sfocano e si scuriscono: profondità vera, non scale+opacity.
 *
 * L'altezza del palco è misurata dal contenuto della card più alta: nessun
 * numero magico per breakpoint e nessun testo tagliato cambiando lingua.
 */
export function CaseCarousel({ cardIds, activeIndex, onNavigate, reducedMotion }: CaseCarouselProps) {
  const locale = useLocale() as "it" | "en";
  const copy = caseStudiesCopy[locale];
  const ui = copy.ui;
  const len = cardIds.length;

  // Gli strumenti si animano quando la sezione entra in viewport (spec §5.2,
  // "once"), non al mount: fuori campo non gira un solo rAF.
  const { ref: frameRef, isInView } = useInViewport<HTMLDivElement>({ threshold: 0.15 });
  const stageRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const scrimRefs = useRef<Array<HTMLElement | null>>([]);
  const metricsRef = useRef<StageMetrics>({
    stageWidth: 1000,
    cardWidth: 560,
    sideX: 300,
    backX: 400,
  });

  /** Posizione di riposo (interi) e posizione corrente (continua) di ogni card. */
  const baseRef = useRef<number[]>(cardIds.map((_, i) => shortestOffset(i, activeIndex, len)));
  const curRef = useRef<number[]>(cardIds.map((_, i) => shortestOffset(i, activeIndex, len)));
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const lockRef = useRef(false);
  const activeRef = useRef(activeIndex);

  const [stageHeight, setStageHeight] = useState(STAGE_FALLBACK_HEIGHT);
  const [roles, setRoles] = useState<CasePosition[]>(() =>
    cardIds.map((_, i) => roleFor(shortestOffset(i, activeIndex, len))),
  );
  const [dragging, setDragging] = useState(false);

  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastT: 0,
    prevX: 0,
    prevT: 0,
    moved: false,
  });

  /* ------------------------------------------------------------ scena ---- */

  const applyTransforms = useCallback(() => {
    const m = metricsRef.current;
    slotRefs.current.forEach((el, i) => {
      if (!el) return;
      const offset = curRef.current[i];
      const slot = slotForOffset(offset, m);
      // solo transform/opacity/filter: nessuna proprietà di layout (§7)
      gsap.set(el, {
        x: slot.x,
        z: slot.z,
        rotationY: slot.rotY,
        opacity: slot.opacity,
        zIndex: zIndexForOffset(offset),
        filter: slot.blur > 0.25 ? `blur(${slot.blur}px)` : "none",
        force3D: true,
      });
      let scrim = scrimRefs.current[i];
      if (!scrim || !el.contains(scrim)) {
        scrim = el.querySelector<HTMLElement>("[data-case-scrim]");
        scrimRefs.current[i] = scrim;
      }
      if (scrim) gsap.set(scrim, { opacity: slot.scrim });
    });
  }, []);

  /* --------------------------------------------------- misure del palco --- */

  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const stageWidth = stage.clientWidth;
    const cardWidth = slotRefs.current[0]?.offsetWidth ?? Math.min(560, stageWidth * 0.88);
    metricsRef.current = computeStageMetrics(stageWidth, cardWidth);

    const bodies = Array.from(stage.querySelectorAll<HTMLElement>("[data-case-body]"));
    const tallest = bodies.reduce((max, b) => Math.max(max, b.offsetHeight), 0);
    if (tallest > 0) setStageHeight(Math.ceil(tallest));

    applyTransforms();
  }, [applyTransforms]);

  useLayoutEffect(() => {
    measure();
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    stage.querySelectorAll<HTMLElement>("[data-case-body]").forEach((b) => ro.observe(b));
    return () => ro.disconnect();
  }, [measure]);

  /* -------------------------------------------------------- navigazione --- */

  const settle = useCallback(
    (targets: number[], opts: { duration?: number; ease?: string } = {}) => {
      tweenRef.current?.kill();
      const start = [...curRef.current];

      // I ruoli passano subito allo stato finale: la card entrante è già quella
      // interattiva mentre arriva al centro, e quella uscente smette di essere
      // tabbabile nell'istante in cui l'utente ha deciso di lasciarla.
      setRoles(targets.map(roleFor));

      if (reducedMotion) {
        curRef.current = [...targets];
        baseRef.current = [...targets];
        applyTransforms();
        lockRef.current = false;
        return;
      }

      const proxy = { p: 0 };
      tweenRef.current = gsap.to(proxy, {
        p: 1,
        duration: opts.duration ?? 0.6,
        ease: opts.ease ?? "power3.out",
        onUpdate: () => {
          curRef.current = start.map((s, i) => s + (targets[i] - s) * proxy.p);
          applyTransforms();
        },
        onComplete: () => {
          curRef.current = [...targets];
          baseRef.current = [...targets];
          applyTransforms();
          lockRef.current = false;
        },
      });
    },
    [applyTransforms, reducedMotion],
  );

  /**
   * Porta ogni card sul rappresentante equivalente più vicino al proprio target
   * PRIMA che parta il tween, e ridipinge subito: è il "wrap" invisibile che
   * evita a una card di attraversare il primo piano per raggiungere il lato
   * opposto della giostra (vedi wrapNear).
   */
  const applyWrap = useCallback(
    (targets: number[]) => {
      let moved = false;
      for (let i = 0; i < targets.length; i++) {
        const next = wrapNear(curRef.current[i], targets[i], len);
        if (next !== curRef.current[i]) {
          curRef.current[i] = next;
          moved = true;
        }
      }
      if (moved) applyTransforms();
    },
    [applyTransforms, len],
  );

  const goTo = useCallback(
    (nextIndex: number, direction: "next" | "prev" | "jump", velocity = 0) => {
      const normalized = ((nextIndex % len) + len) % len;
      if (normalized === activeRef.current || lockRef.current) return;
      lockRef.current = true;
      activeRef.current = normalized;
      onNavigate(normalized, direction);

      const targets = cardIds.map((_, i) =>
        bandOffset(i, normalized, len, curRef.current[i]),
      );
      applyWrap(targets);
      const duration = Math.max(0.36, 0.62 - velocity * 0.18);
      settle(targets, { duration, ease: "back.out(1.08)" });
    },
    [applyWrap, cardIds, len, onNavigate, settle],
  );

  // l'indice può cambiare anche dall'esterno (sezione, deep link): allineati.
  useEffect(() => {
    if (activeIndex === activeRef.current) return;
    activeRef.current = activeIndex;
    const targets = cardIds.map((_, i) => bandOffset(i, activeIndex, len, curRef.current[i]));
    applyWrap(targets);
    lockRef.current = true;
    settle(targets, { duration: 0.6, ease: "back.out(1.08)" });
  }, [activeIndex, applyWrap, cardIds, len, settle]);

  useEffect(() => {
    return () => {
      tweenRef.current?.kill();
    };
  }, []);

  const next = useCallback(
    (velocity = 0) => goTo(activeRef.current + 1, "next", velocity),
    [goTo],
  );
  const prev = useCallback(
    (velocity = 0) => goTo(activeRef.current - 1, "prev", velocity),
    [goTo],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  };

  /* ---------------------------------------------------------------- drag -- */

  const dragFull = () => Math.max(120, metricsRef.current.cardWidth * DRAG_FULL_RATIO);

  const onPointerDown = (e: React.PointerEvent) => {
    if (lockRef.current || e.button !== 0) return;
    // Un CTA, una freccia o il pannello dei dettagli aperto non sono maniglie di
    // trascinamento: lì il puntatore serve a cliccare e a scorrere.
    if ((e.target as HTMLElement).closest("button, a, [data-lenis-prevent]")) return;
    const d = dragRef.current;
    d.active = true;
    d.pointerId = e.pointerId;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.lastX = e.clientX;
    d.lastT = performance.now();
    d.prevX = e.clientX;
    d.prevT = d.lastT;
    d.moved = false;
    tweenRef.current?.kill();
    baseRef.current = [...curRef.current];
    // NIENTE setPointerCapture qui: la cattura dirotta anche il `click` di
    // compatibilità sull'elemento che cattura, e i bottoni dentro la card
    // smetterebbero di essere cliccabili. Si cattura solo quando il gesto è
    // diventato davvero un trascinamento (vedi onPointerMove).
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.active || e.pointerId !== d.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      // gesto verticale: è scroll di pagina, non trascinamento del carosello
      if (Math.abs(dy) > Math.abs(dx)) {
        d.active = false;
        return;
      }
      d.moved = true;
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    d.prevX = d.lastX;
    d.prevT = d.lastT;
    d.lastX = e.clientX;
    d.lastT = performance.now();

    // 1:1 col puntatore, nessun easing durante il drag (spec §5.5)
    const shift = dx / dragFull();
    curRef.current = baseRef.current.map((b) => b + shift);
    applyTransforms();
  };

  const endDrag = (e?: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.active) return;
    if (e && d.moved && e.currentTarget.hasPointerCapture?.(d.pointerId)) {
      e.currentTarget.releasePointerCapture(d.pointerId);
    }
    d.active = false;
    setDragging(false);
    if (!d.moved) return;

    const dx = d.lastX - d.startX;
    const dt = Math.max(1, d.lastT - d.prevT);
    const velocity = Math.abs(d.lastX - d.prevX) / dt;
    const ratio = Math.abs(dx) / Math.max(1, metricsRef.current.cardWidth);

    if (ratio > DRAG_DISTANCE_RATIO || velocity > DRAG_VELOCITY_PX_MS) {
      if (dx < 0) next(velocity);
      else prev(velocity);
      return;
    }
    // sotto soglia: si torna alla posizione di partenza (nessun lock: un nuovo
    // drag deve poter riprendere subito il controllo della card)
    settle([...baseRef.current], { duration: 0.5, ease: "power3.out" });
  };

  /* ------------------------------------------------------------- visuals -- */

  const dataMetrics = useMemo(
    () => resolveDataMetrics(locale, CASE_A_DETAIL_LEVEL),
    [locale],
  );
  const dataHeadline = useMemo(
    () => resolveDataHeadline(locale, CASE_A_DETAIL_LEVEL),
    [locale],
  );

  const renderVisual = (id: CaseCardId, isActive: boolean) => {
    switch (id) {
      case "data":
        return (
          <DataScatter
            seed={DATA_SCATTER_SEED}
            pointCount={72}
            metrics={dataMetrics.slice(0, 4)}
            reducedMotion={reducedMotion}
            locale={locale}
            active={isActive}
            caption={ui.illustrative}
            readout={ui.readoutData}
          />
        );
      case "fintech":
        return (
          <VolatilityDial
            score={fintechDialData.score}
            winRate={fintechDialData.winRate}
            riskReward={fintechDialData.riskReward}
            reducedMotion={reducedMotion}
            disclaimer={copy.fintechDisclaimer}
            locale={locale}
            active={isActive}
            labels={{
              score: ui.scoreCaption,
              winRate: ui.winRate,
              riskReward: ui.riskReward,
              readout: ui.readoutSignals,
            }}
          />
        );
      case "edtech":
        return (
          <div className={styles.instrument}>
            <div className={styles.instrumentHead}>
              <span className={styles.readout}>{ui.pressLabel}</span>
              <span className={styles.signal} aria-hidden="true">
                {[6, 9, 12, 14].map((h, i) => (
                  <span
                    key={h}
                    className={styles.signalBar}
                    style={{
                      height: h,
                      transform: reducedMotion || isActive ? "scaleY(1)" : "scaleY(0.2)",
                      transition: reducedMotion
                        ? "none"
                        : `transform 340ms var(--ease-out) ${i * 70}ms`,
                    }}
                  />
                ))}
              </span>
            </div>
            <ul className={styles.proofList}>
              {copy.edtechProofRows.map((row, i) => (
                <li key={row.source} className={styles.proofRow}>
                  <span className={styles.proofIndex}>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className={styles.proofSource}>{row.source}</p>
                    <p className={styles.proofNote}>{row.note}</p>
                  </div>
                </li>
              ))}
            </ul>
            <span className={styles.badgeHi}>{copy.edtechHighlightBadge}</span>
          </div>
        );
      case "custom":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className={styles.shot}>
              <Image
                src="/images/case-studies/locanda-camilla.svg"
                alt={
                  locale === "it"
                    ? "Homepage del sito Locanda Camilla, sviluppato su misura con focus su performance e SEO"
                    : "Homepage of the Locanda Camilla website, custom-built with a performance-and-SEO focus"
                }
                width={1200}
                height={675}
                className={styles.shotImg}
              />
              <span className={styles.shotBadge}>{ui.realScreenshot}</span>
            </div>
            <ComparisonBarChart
              rows={customComparisonRows}
              reducedMotion={reducedMotion}
              locale={locale}
              siteLabel={ui.siteLabel}
              industryLabel={ui.industryAvg}
              active={isActive}
              readout={ui.readoutPagespeed}
            />
          </div>
        );
      default:
        return null;
    }
  };

  /* -------------------------------------------- testo integrale (dettagli) */

  const detailBlocksFor = (id: CaseCardId): CaseDetailBlock[] => {
    const card = resolveCardCopy(locale, id, CASE_A_DETAIL_LEVEL);
    const blocks: CaseDetailBlock[] = [
      { label: ui.labelChallenge, text: card.challenge },
      { label: ui.labelApproach, text: card.approach },
    ];
    if (id === "data") {
      blocks.push({ label: ui.labelResult, text: `${copy.dataResultIntro} ${card.result}` });
    } else if (id === "custom") {
      blocks.push({
        label: ui.labelResult,
        text: `${copy.customResultIntro} ${copy.customResultClaim}`,
      });
    } else if (id === "edtech") {
      blocks.push(
        { label: ui.labelResult, text: card.result },
        { label: ui.pressLabel, text: copy.edtechSocialProof.pressQuote },
        { label: "LinkedIn", text: copy.edtechSocialProof.linkedinQuote },
        { label: ui.labelArticle, text: copy.edtechSocialProof.articleLabel },
      );
    } else {
      blocks.push(
        { label: ui.labelResult, text: copy.fintechResult },
        { label: ui.labelNote, text: copy.fintechDisclaimer },
      );
    }
    return blocks;
  };

  /* Nessun href inventato: vedi nota in fondo al file. */
  const ctaHrefFor = (id: CaseCardId) =>
    id === "data" || id === "fintech" ? "#metodo" : undefined;

  const onCtaClick = (href?: string) => (e: ReactMouseEvent) => {
    if (!href?.startsWith("#")) return;
    e.preventDefault();
    smoothScrollTo(href);
  };

  /* ---------------------------------------------------------------- vista */

  return (
    <div className={styles.frame} ref={frameRef}>
      <Tactile
        as="button"
        intensity="subtle"
        magnetic
        magneticMax={10}
        onClick={() => prev()}
        aria-label={ui.prev}
        className={cn(styles.arrow, styles.arrowPrev)}
      >
        ‹
      </Tactile>
      <Tactile
        as="button"
        intensity="subtle"
        magnetic
        magneticMax={10}
        onClick={() => next()}
        aria-label={ui.next}
        className={cn(styles.arrow, styles.arrowNext)}
      >
        ›
      </Tactile>

      <div
        ref={stageRef}
        className={cn(styles.stage, dragging && styles.dragging)}
        style={{ height: stageHeight }}
        role="group"
        aria-roledescription="carousel"
        aria-label={ui.carouselLabel}
        tabIndex={0}
        data-cursor="drag"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {cardIds.map((id, i) => {
          const position = roles[i];
          const isForeground = position === "foreground";
          const card = resolveCardCopy(locale, id, CASE_A_DETAIL_LEVEL);
          return (
            <div
              key={id}
              ref={(el) => {
                slotRefs.current[i] = el;
              }}
              className={cn(styles.slot, isForeground ? styles.slotForeground : styles.slotBack)}
              /* posizione di scena del PRIMO frame dipinto, in CSS puro: senza
                 questa, l'HTML servito mostrerebbe le quattro card sovrapposte
                 al centro finché GSAP non prende il controllo. */
              data-init={Math.max(-2, Math.min(2, shortestOffset(i, activeIndex, len)))}
              inert={!isForeground}
              aria-hidden={!isForeground}
            >
              <CaseCard
                id={id}
                copy={card}
                accentVisual={
                  id === "data"
                    ? "scatter"
                    : id === "fintech"
                      ? "dial"
                      : id === "edtech"
                        ? "social-proof"
                        : "screenshot+chart"
                }
                reducedMotion={reducedMotion}
                position={position}
                ui={ui}
                headline={id === "data" ? dataHeadline : (card.headline ?? null)}
                headlineFallback={id === "data" ? card.result : undefined}
                detailBlocks={detailBlocksFor(id)}
                index={i}
                total={len}
                ctaHref={ctaHrefFor(id)}
                onCtaClick={onCtaClick(ctaHrefFor(id))}
              >
                {renderVisual(id, isForeground && isInView)}
              </CaseCard>
            </div>
          );
        })}
      </div>

      <div className={styles.controls}>
        <Tactile
          as="button"
          intensity="subtle"
          magnetic
          magneticMax={8}
          onClick={() => prev()}
          aria-label={ui.prev}
          className={styles.arrowSmall}
        >
          ‹
        </Tactile>

        <div className={styles.dots}>
          {cardIds.map((id, i) => (
            <Tactile
              key={id}
              as="button"
              intensity="playful"
              magnetic
              magneticMax={6}
              onClick={() => goTo(i, "jump")}
              aria-label={`${ui.goTo} ${copy.cards[id].title}`}
              aria-current={i === activeIndex}
              className={cn(styles.dot, i === activeIndex && styles.dotActive)}
            />
          ))}
        </div>

        <Tactile
          as="button"
          intensity="subtle"
          magnetic
          magneticMax={8}
          onClick={() => next()}
          aria-label={ui.next}
          className={styles.arrowSmall}
        >
          ›
        </Tactile>

        <span className={styles.hint}>{ui.dragHint}</span>
      </div>
    </div>
  );
}

export default CaseCarousel;

/**
 * Nota deviazione (invariata dalla v1): le CTA "Leggi la copertura stampa"
 * (Card C) e "Visita il sito" (Card D) non ricevono un href. Lo spec non
 * fornisce URL verificati per gli articoli stampa, il post LinkedIn o il
 * dominio di Locanda Camilla, e inventarli avrebbe violato la regola "nessun
 * fatto fabbricato". Restano elementi tattili funzionanti, pronti a ricevere
 * l'href reale. Per la Card C questo coincide anche col vincolo §8: nessun
 * link al repository GitHub del motore.
 */
