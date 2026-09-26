"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { gsap, ScrollTrigger, ensureGsapRegistered } from "@/lib/animation/gsap";
import { PhaseCard } from "./PhaseCard";
import { DeckControls } from "./DeckControls";
import {
  DECK_PERSPECTIVE,
  HOVER_SPREAD,
  THROW_DISTANCE_RATIO,
  THROW_VELOCITY_PX_MS,
  slotAt,
  stackVars,
  zIndexFor,
} from "./deckStack";
import type { MethodUiCopy, PhaseCopy } from "@/content/method";

export type PhaseDeckProps = {
  phases: readonly PhaseCopy[];
  ui: MethodUiCopy;
  reducedMotion: boolean;
  /** opzionale: se non passato, il mazzo gestisce il proprio stato. */
  activeIndex?: number;
  onNavigate?: (nextIndex: number, direction: "next" | "prev" | "jump") => void;
};

type NavDirection = "next" | "prev";

/* ============================================================================
   PhaseDeck — il mazzo.

   Modello di trasformazione (deckStack.ts): contenitore con `perspective` e
   `transform-style: preserve-3d`; ogni carta è centrata in absolute e riceve
   translate3d(x, y, z) + rotate(θ). Y è negativo e Z arretra, così sopra la
   carta in cima restano scoperte tre lamelle di ~10-16px, e le rotazioni
   alternate (+3.1° / -4.2° / +5.6°) aprono i bordi a ventaglio: è questo, più
   del filo di luce sul taglio superiore, a far leggere la pila come un mazzo.
   Lo stato di riposo è renderizzato SSR come stile inline, quindi lo spessore
   c'è già nel primo frame dipinto (spec §5.2 / §8, requisito esplicito).

   Meccanica di avanzamento: la carta in cima viene LANCIATA — arco (sale, poi
   cade), rotazione crescente e uscita di campo — mentre le tre sotto risalgono
   di uno scalino con un back.out che dà il rimbalzo di assestamento. Quando è
   invisibile, la carta lanciata viene riportata in fondo alla pila e ci rientra
   in dissolvenza: il mazzo resta sempre di quattro carte.
   ========================================================================== */

export function PhaseDeck({
  phases,
  ui,
  reducedMotion,
  activeIndex: controlledIndex,
  onNavigate,
}: PhaseDeckProps) {
  const count = phases.length;

  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = controlledIndex ?? internalIndex;
  const [isTransitioning, setIsTransitioning] = useState(false);
  /** Indice della carta che sta volando via: tiene il contenuto montato mentre esce. */
  const [leavingIndex, setLeavingIndex] = useState<number | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<Array<HTMLDivElement | null>>([]);
  const scrimsRef = useRef<Array<HTMLSpanElement | null>>([]);

  const activeRef = useRef(activeIndex);
  const lockRef = useRef(false);
  const prevIndexRef = useRef<number | null>(null);
  const dirRef = useRef<NavDirection>("next");
  /** Direzione orizzontale del lancio: -1 sinistra, +1 destra (la dà il drag). */
  const throwDirRef = useRef(-1);
  const introDoneRef = useRef(false);
  const hoverSpreadRef = useRef(1);
  const emphasisRef = useRef<number | null>(null);
  const tiltRafRef = useRef(0);

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

  // Specchio dell'indice attivo leggibile dagli handler imperativi. Sincronizzato
  // in un layout effect dichiarato PRIMA di quelli di intro e transizione, così
  // quando la timeline di lancio parte il ref è già aggiornato.
  useLayoutEffect(() => {
    activeRef.current = activeIndex;
  }, [activeIndex]);

  const depthOf = useCallback(
    (cardIndex: number, active = activeRef.current) => (cardIndex - active + count) % count,
    [count],
  );

  /* ---------- riposo: un solo punto che riporta ogni carta al proprio slot ---------- */
  const settle = useCallback(
    (opts: { immediate?: boolean; duration?: number; ease?: string; skip?: number | null } = {}) => {
      const cards = cardsRef.current;
      const spread = hoverSpreadRef.current;
      cards.forEach((el, i) => {
        if (!el || i === opts.skip) return;
        const d = depthOf(i);
        const v = stackVars(d, { spread, emphasis: emphasisRef.current === i });
        const scrim = scrimsRef.current[i];
        gsap.set(el, { zIndex: zIndexFor(d) });
        if (opts.immediate || reducedMotion) {
          gsap.set(el, { ...v, opacity: 1, rotationX: 0, rotationY: 0 });
          if (scrim) gsap.set(scrim, { opacity: slotAt(d).scrim });
        } else {
          gsap.to(el, {
            ...v,
            opacity: 1,
            rotationX: 0,
            rotationY: 0,
            duration: opts.duration ?? 0.55,
            ease: opts.ease ?? "back.out(1.35)",
            overwrite: "auto",
          });
          if (scrim) {
            gsap.to(scrim, { opacity: slotAt(d).scrim, duration: 0.45, overwrite: "auto" });
          }
        }
      });
    },
    [depthOf, reducedMotion],
  );

  /* ---------- navigazione ---------- */
  const navigate = useCallback(
    (nextIndex: number, direction: "next" | "prev" | "jump") => {
      if (lockRef.current || nextIndex === activeRef.current) return;
      lockRef.current = true;
      setIsTransitioning(true);
      prevIndexRef.current = activeRef.current;
      dirRef.current = direction === "prev" ? "prev" : "next";
      if (dirRef.current === "next") setLeavingIndex(activeRef.current);
      onNavigate?.(nextIndex, direction);
      if (controlledIndex === undefined) setInternalIndex(nextIndex);
    },
    [controlledIndex, onNavigate],
  );

  const goNext = useCallback(() => {
    throwDirRef.current = -1;
    navigate((activeRef.current + 1) % count, "next");
  }, [count, navigate]);

  const goPrev = useCallback(() => {
    navigate((activeRef.current - 1 + count) % count, "prev");
  }, [count, navigate]);

  const goTo = useCallback(
    (target: number) => {
      if (target === activeRef.current) return;
      const forward = (target - activeRef.current + count) % count;
      throwDirRef.current = -1;
      navigate(target, forward <= count / 2 ? "next" : "prev");
    },
    [count, navigate],
  );

  /* ---------- stato iniziale + intro (§5.1-5.2) ---------- */
  useLayoutEffect(() => {
    ensureGsapRegistered();
    const cards = cardsRef.current;

    // Riallinea GSAP allo stato già dipinto dal server: stessi valori, quindi
    // l'idratazione non muove nulla. `xPercent/yPercent` sostituiscono il
    // translate(-50%,-50%) dello stile inline.
    cards.forEach((el, i) => {
      if (!el) return;
      const v = stackVars(i);
      // NB: nessun `transformPerspective` qui — la prospettiva è dichiarata una
      // sola volta sul palco. Metterla anche sulla carta la applicherebbe due
      // volte e la matrice GSAP non coinciderebbe più con lo stile inline SSR,
      // producendo uno scatto all'idratazione.
      gsap.set(el, {
        xPercent: -50,
        yPercent: -50,
        ...v,
        opacity: 1,
        zIndex: zIndexFor(i),
      });
      const scrim = scrimsRef.current[i];
      if (scrim) gsap.set(scrim, { opacity: slotAt(i).scrim });
    });

    if (reducedMotion) {
      // `usePrefersReducedMotion` parte da false e può ribaltarsi dopo il mount:
      // se il passaggio precedente aveva già nascosto i blocchi di testo in
      // attesa dell'intro, qui vanno rimessi visibili, altrimenti la carta
      // resterebbe muta proprio per chi ha chiesto meno movimento.
      cards.forEach((el) => {
        if (!el) return;
        const p = el.querySelectorAll<HTMLElement>("[data-part]");
        if (p.length) gsap.set(p, { opacity: 1, y: 0 });
      });
      introDoneRef.current = true;
      return;
    }

    const activeEl = cards[0];
    const parts = activeEl ? activeEl.querySelectorAll<HTMLElement>("[data-part]") : null;
    if (parts?.length) gsap.set(parts, { opacity: 0, y: 12 });

    const playIntro = () => {
      if (introDoneRef.current) return;
      introDoneRef.current = true;

      const tl = gsap.timeline();
      // Assestamento: le carte partono già impilate (mazzo semi-chiuso) e si
      // aprono a ventaglio dal fondo verso la cima. Mai un fade da carta sola.
      cards.forEach((el, i) => {
        if (!el) return;
        const v = stackVars(i);
        tl.fromTo(
          el,
          { x: v.x * 0.3, y: v.y * 0.28 + 22, z: v.z * 0.45, rotation: v.rotation * 0.25 },
          { ...v, duration: 0.72, ease: "back.out(1.3)" },
          (count - 1 - i) * 0.07,
        );
      });
      if (parts?.length) {
        tl.to(parts, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", stagger: 0.055 }, 0.3);
      }
    };

    const st = ScrollTrigger.create({
      trigger: wrapRef.current,
      start: "top 78%",
      once: true,
      onEnter: playIntro,
    });

    return () => {
      st.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  /* ---------- lancio + riassestamento (§5.3) ---------- */
  useLayoutEffect(() => {
    const prev = prevIndexRef.current;
    if (prev === null || prev === activeIndex) return;
    prevIndexRef.current = activeIndex;

    const dir = dirRef.current;
    const cards = cardsRef.current;
    const unlock = () => {
      lockRef.current = false;
      setIsTransitioning(false);
      setLeavingIndex(null);
    };

    const enteringEl = cards[activeIndex];
    const enteringParts = enteringEl
      ? enteringEl.querySelectorAll<HTMLElement>("[data-part]")
      : null;

    if (reducedMotion) {
      // §6 — nessuna coreografia: snap agli offset finali + crossfade breve.
      settle({ immediate: true });
      if (enteringParts?.length) {
        gsap.fromTo(enteringParts, { opacity: 0 }, { opacity: 1, duration: 0.15 });
      }
      unlock();
      return;
    }

    const stageWidth = stageRef.current?.offsetWidth ?? 480;
    const flightX = Math.max(560, stageWidth * 1.45);
    const tl = gsap.timeline({ onComplete: unlock });

    if (dir === "next") {
      const outEl = cards[prev];
      const outScrim = scrimsRef.current[prev];
      const sx = throwDirRef.current < 0 ? -1 : 1;

      if (outEl) {
        gsap.set(outEl, { zIndex: 60 });
        // Arco naturale: la carta si stacca verso l'osservatore, sale, poi cade
        // ruotando — non una traslazione lineare.
        tl.to(outEl, { z: 170, duration: 0.16, ease: "power2.out" }, 0)
          .to(outEl, { x: sx * flightX, duration: 0.66, ease: "power2.in" }, 0)
          .to(outEl, { rotation: sx * 30, duration: 0.66, ease: "power1.in" }, 0)
          .to(outEl, { y: "-=86", duration: 0.2, ease: "power2.out" }, 0)
          .to(outEl, { y: "+=320", duration: 0.48, ease: "power2.in" }, 0.2)
          .to(outEl, { opacity: 0, duration: 0.2, ease: "power1.in" }, 0.42);
        if (outScrim) tl.to(outScrim, { opacity: 0.1, duration: 0.2 }, 0);

        // Rientro in fondo alla pila: il mazzo resta sempre di quattro carte.
        tl.call(
          () => {
            const d = depthOf(prev);
            const v = stackVars(d, { spread: hoverSpreadRef.current });
            gsap.set(outEl, {
              ...v,
              z: v.z - 110,
              rotationX: 0,
              rotationY: 0,
              opacity: 0,
              zIndex: zIndexFor(d),
            });
            gsap.to(outEl, { ...v, opacity: 1, duration: 0.5, ease: "power3.out" });
            if (outScrim) gsap.to(outScrim, { opacity: slotAt(d).scrim, duration: 0.45 });
          },
          undefined,
          // DOPO la fine di tutti i tween di volo (x 0.66, y 0.68): un gsap.set
          // piazzato mentre quei tween sono ancora vivi verrebbe riscritto al
          // frame successivo.
          0.7,
        );
      }

      // Le altre risalgono di uno scalino, con rimbalzo e stagger dal fondo.
      cards.forEach((el, i) => {
        if (!el || i === prev) return;
        const d = depthOf(i);
        const v = stackVars(d, { spread: hoverSpreadRef.current });
        const scrim = scrimsRef.current[i];
        gsap.set(el, { zIndex: zIndexFor(d) });
        tl.to(
          el,
          {
            ...v,
            opacity: 1,
            rotationX: 0,
            rotationY: 0,
            duration: 0.62,
            ease: "back.out(1.5)",
            // se la carta stava ancora rientrando in fondo alla pila da un
            // lancio precedente, quel tween va ucciso, non sommato
            overwrite: "auto",
          },
          0.04 + (count - 1 - d) * 0.035,
        );
        if (scrim) tl.to(scrim, { opacity: slotAt(d).scrim, duration: 0.5 }, 0.04);
      });

      if (enteringParts?.length) {
        tl.fromTo(
          enteringParts,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.42, ease: "power3.out", stagger: 0.05 },
          0.18,
        );
      }
    } else {
      // Indietro: la carta precedente viene RIPRESA da fuori campo e rimessa in
      // cima — direzione opposta, lettura opposta (§5.3, checklist §8).
      cards.forEach((el, i) => {
        if (!el || i === activeIndex) return;
        const d = depthOf(i);
        const v = stackVars(d, { spread: hoverSpreadRef.current });
        const scrim = scrimsRef.current[i];
        gsap.set(el, { zIndex: zIndexFor(d) });
        tl.to(
          el,
          {
            ...v,
            opacity: 1,
            rotationX: 0,
            rotationY: 0,
            duration: 0.55,
            ease: "power3.out",
            overwrite: "auto",
          },
          0,
        );
        if (scrim) tl.to(scrim, { opacity: slotAt(d).scrim, duration: 0.45 }, 0);
      });

      if (enteringEl) {
        const v = stackVars(0);
        gsap.set(enteringEl, {
          zIndex: 60,
          x: flightX * 0.85,
          y: -110,
          z: 190,
          rotation: 26,
          rotationX: 0,
          rotationY: 0,
          opacity: 0,
        });
        const scrim = scrimsRef.current[activeIndex];
        if (scrim) gsap.set(scrim, { opacity: 0 });
        tl.to(enteringEl, { opacity: 1, duration: 0.18 }, 0)
          .to(enteringEl, { ...v, duration: 0.72, ease: "back.out(1.15)", overwrite: "auto" }, 0)
          .call(() => gsap.set(enteringEl, { zIndex: zIndexFor(0) }), undefined, 0.72);
      }
      if (enteringParts?.length) {
        tl.fromTo(
          enteringParts,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.42, ease: "power3.out", stagger: 0.05 },
          0.24,
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  /* ---------- hover: il mazzo si apre, le carte dietro reagiscono ---------- */
  const setSpread = useCallback(
    (open: boolean) => {
      if (reducedMotion) return;
      hoverSpreadRef.current = open ? HOVER_SPREAD : 1;
      // durante un lancio o un drag il mazzo è già governato altrove
      if (lockRef.current || dragRef.current.active) return;
      settle({ duration: 0.6, ease: "back.out(1.6)", skip: activeRef.current });
    },
    [reducedMotion, settle],
  );

  const emphasize = useCallback(
    (cardIndex: number | null) => {
      if (reducedMotion || lockRef.current || dragRef.current.active) return;
      emphasisRef.current = cardIndex;
      settle({ duration: 0.5, ease: "back.out(2)", skip: activeRef.current });
    },
    [reducedMotion, settle],
  );

  /* ---------- tilt 3D della carta in cima (ART-DIRECTION §5 C) ---------- */
  const onStagePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (reducedMotion || dragRef.current.active || lockRef.current) return;
      const stage = stageRef.current;
      const el = cardsRef.current[activeRef.current];
      if (!stage || !el) return;
      const r = stage.getBoundingClientRect();
      const nx = (e.clientX - r.left) / Math.max(r.width, 1) - 0.5;
      const ny = (e.clientY - r.top) / Math.max(r.height, 1) - 0.5;
      if (tiltRafRef.current) return;
      tiltRafRef.current = requestAnimationFrame(() => {
        tiltRafRef.current = 0;
        gsap.to(el, {
          rotationY: nx * 11,
          rotationX: -ny * 8,
          duration: 0.6,
          ease: "power3.out",
          overwrite: "auto",
        });
      });
    },
    [reducedMotion],
  );

  const resetTilt = useCallback(() => {
    // mai interferire con un lancio o un drag in corso
    if (lockRef.current || dragRef.current.active) return;
    const el = cardsRef.current[activeRef.current];
    if (el && !reducedMotion) {
      gsap.to(el, { rotationX: 0, rotationY: 0, duration: 0.6, ease: "power3.out", overwrite: "auto" });
    }
  }, [reducedMotion]);

  /* ---------- drag-to-flick ---------- */
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (lockRef.current || e.button !== 0) return;
      const now = performance.now();
      dragRef.current = {
        active: true,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastT: now,
        prevX: e.clientX,
        prevT: now,
        moved: false,
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag.active) {
        onStagePointerMove(e);
        return;
      }
      const el = cardsRef.current[activeRef.current];
      if (!el) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > 4) drag.moved = true;
      drag.prevX = drag.lastX;
      drag.prevT = drag.lastT;
      drag.lastX = e.clientX;
      drag.lastT = performance.now();

      if (reducedMotion) return;

      // 1:1 col dito, con la carta che si stacca dal mazzo mentre la trascini.
      gsap.set(el, {
        x: dx,
        y: stackVars(0).y + dy * 0.3,
        z: 120,
        rotation: dx * 0.05,
        rotationX: 0,
        rotationY: 0,
      });

      // La carta sotto anticipa la salita in proporzione alla corsa: è il
      // momento di "mini sovrapposizione" chiesto dallo spec §5.3.
      const width = stageRef.current?.offsetWidth ?? 480;
      // Solo trascinando a SINISTRA si sta sfilando la carta in cima: in quel
      // caso la successiva anticipa la salita. A destra si sta richiamando la
      // precedente, e il mazzo sotto non si muove.
      const p = dx < 0 ? Math.min(1, Math.abs(dx) / (width * THROW_DISTANCE_RATIO)) : 0;
      const nextEl = cardsRef.current[(activeRef.current + 1) % count];
      if (nextEl) {
        const from = stackVars(1, { spread: hoverSpreadRef.current });
        const to = stackVars(0);
        gsap.set(nextEl, {
          x: from.x + (to.x - from.x) * p,
          y: from.y + (to.y - from.y) * p,
          z: from.z + (to.z - from.z) * p,
          rotation: from.rotation + (to.rotation - from.rotation) * p,
        });
        const scrim = scrimsRef.current[(activeRef.current + 1) % count];
        if (scrim) gsap.set(scrim, { opacity: slotAt(1).scrim * (1 - p) });
      }
    },
    [count, onStagePointerMove, reducedMotion],
  );

  const endDrag = useCallback(
    (e?: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag.active) return;
      drag.active = false;
      if (e) e.currentTarget.releasePointerCapture?.(drag.pointerId);

      const dx = drag.lastX - drag.startX;
      const dt = Math.max(1, drag.lastT - drag.prevT);
      const width = stageRef.current?.offsetWidth ?? 480;
      const distanceRatio = Math.abs(dx) / width;
      const velocity = Math.abs(drag.lastX - drag.prevX) / dt;

      if (!drag.moved) return;

      if (distanceRatio > THROW_DISTANCE_RATIO || velocity > THROW_VELOCITY_PX_MS) {
        if (dx < 0) {
          throwDirRef.current = -1;
          navigate((activeRef.current + 1) % count, "next");
        } else {
          navigate((activeRef.current - 1 + count) % count, "prev");
        }
      } else {
        // sotto soglia → ritorno elastico, la carta torna a posto nel mazzo
        settle({ duration: 0.55, ease: "elastic.out(1, 0.55)" });
      }
    },
    [count, navigate, settle],
  );

  /* ---------- tastiera ---------- */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  useEffect(() => {
    const raf = tiltRafRef;
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "mx-auto w-full",
        "max-w-[min(84vw,400px)] sm:max-w-[480px] lg:max-w-[560px] min-[1440px]:max-w-[600px]",
      )}
    >
      {/* Contatore — dentro la colonna del mazzo: non può sbordare a nessun
          breakpoint, che è esattamente il difetto segnalato dal cliente. */}
      <div className="mb-5 flex items-baseline justify-between gap-4 sm:mb-6">
        <span className="min-w-0 truncate font-[family-name:var(--font-mono)] text-[length:var(--fs-micro)] uppercase tracking-[var(--ls-micro)] text-[var(--text-low)]">
          {ui.deckLabel}
          <span className="hidden sm:inline"> · {ui.deckHint}</span>
        </span>
        <span className="shrink-0 font-[family-name:var(--font-mono)] text-[13px] font-medium tracking-[0.1em] tabular-nums">
          <span className="text-[var(--aqua-300)]">
            {String(activeIndex + 1).padStart(2, "0")}
          </span>
          <span className="text-[var(--text-low)]"> / {String(count).padStart(2, "0")}</span>
        </span>
      </div>

      {/* Palco 3D: perspective + preserve-3d, l'unico posto che li dichiara. */}
      <div
        ref={stageRef}
        role="group"
        aria-roledescription="deck"
        aria-label={ui.deckAria}
        tabIndex={0}
        data-cursor="drag"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerEnter={() => setSpread(true)}
        onPointerLeave={() => {
          setSpread(false);
          resetTilt();
        }}
        className={cn(
          "relative select-none touch-pan-y",
          // Il palco è più alto della carta: deve contenere il ventaglio delle
          // tre carte sotto (angoli ruotati compresi) senza tagliarlo.
          "h-[520px] sm:h-[536px] lg:h-[560px] min-[1440px]:h-[584px]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[var(--aqua-400)]",
        )}
        style={{
          perspective: `${DECK_PERSPECTIVE}px`,
          transformStyle: "preserve-3d",
        }}
      >
        {phases.map((phase, i) => {
          const isActive = i === activeIndex;
          return (
            <PhaseCard
              key={phase.title}
              ref={(el) => {
                cardsRef.current[i] = el;
              }}
              scrimRef={(el) => {
                scrimsRef.current[i] = el;
              }}
              index={i}
              total={count}
              phase={phase}
              phaseWord={ui.phaseWord}
              initialDepth={i}
              isActive={isActive}
              showContent={isActive || i === leavingIndex}
              onPointerEnterCard={() => {
                if (!isActive) emphasize(i);
              }}
              onPointerLeaveCard={() => {
                if (!isActive && emphasisRef.current === i) emphasize(null);
              }}
              onActivate={() => {
                // Una carta di spessore sotto il cursore è comunque "toccabile":
                // un click sulla sua lamella sfila la carta in cima.
                if (!isActive && !dragRef.current.moved) goNext();
              }}
            />
          );
        })}
      </div>

      <DeckControls
        total={count}
        activeIndex={activeIndex}
        disabled={isTransitioning}
        ui={ui}
        onPrev={goPrev}
        onNext={goNext}
        onJump={goTo}
      />

      {/* Lettura lineare garantita anche senza animazione/JS e agli screen reader:
          le quattro fasi restano tutte raggiungibili come testo. */}
      <div className="sr-only" aria-live="polite">
        {String(activeIndex + 1).padStart(2, "0")} / {String(count).padStart(2, "0")} —{" "}
        {phases[activeIndex]?.title}
      </div>
    </div>
  );
}

export default PhaseDeck;
