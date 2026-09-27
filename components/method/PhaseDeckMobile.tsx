"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils/cn";
import { THROW_DISTANCE_RATIO, THROW_VELOCITY_PX_MS } from "./deckStack";
import type { MethodUiCopy, PhaseCopy } from "@/content/method";

/* ============================================================================
   PhaseDeckMobile — il mazzo per i telefoni.

   Stessa metafora della desktop (carta in cima che si lancia, le altre che
   risalgono di uno scalino), ma costruita per il budget di un telefono:
   · SOLO 2D: translate3d + rotate + scale. Nessuna `perspective`, nessun
     preserve-3d, nessun GSAP: le carte sono 4 layer compositi, animati da
     transizioni CSS su transform/opacity.
   · TUTTE le quattro facce sono renderizzate (le carte sotto sono coperte da
     quella in cima): il testo di ogni fase è nel DOM, come chiede
     l'indicizzazione mobile-first. La desktop monta solo la faccia attiva.
   · Swipe orizzontale nativo: `touch-action: pan-y` lascia lo scroll verticale
     al browser (che annulla il gesto con pointercancel), il trascinamento
     orizzontale scrive DUE custom property sulla carta (--dx, --dr) dentro un
     rAF — React non ri-renderizza durante il drag.
   · Sinistra = avanti (la carta vola via a sinistra), destra = indietro (la
     precedente rientra da destra in cima). Stesse soglie della desktop.
   · Le carte sono impilate in una griglia 1×1: l'altezza del palco è quella
     della carta più lunga, niente altezze fisse che taglino il testo.
   ========================================================================== */

type Fly =
  | { kind: "out"; index: number; dir: -1 | 1 } // carta lanciata fuori campo
  | { kind: "back"; index: number } // la lanciata riappare in fondo (senza transizione)
  | { kind: "in-start"; index: number } // la precedente, posata fuori campo a destra
  | null;

const SLOT = [
  { y: 0, s: 1, r: 0, o: 1 },
  { y: -12, s: 0.955, r: 2.2, o: 1 },
  { y: -23, s: 0.91, r: -2.8, o: 1 },
  { y: -33, s: 0.865, r: 3.4, o: 0.9 },
] as const;

const EASE_SETTLE = "cubic-bezier(.2,.9,.25,1.12)";
const pad = (n: number) => String(n).padStart(2, "0");

export function PhaseDeckMobile({
  phases,
  ui,
  reducedMotion,
  activeIndex,
  onNavigate,
}: {
  phases: readonly PhaseCopy[];
  ui: MethodUiCopy;
  reducedMotion: boolean;
  activeIndex: number;
  onNavigate: (nextIndex: number) => void;
}) {
  const n = phases.length;
  const [fly, setFly] = useState<Fly>(null);
  const cardsRef = useRef<Array<HTMLDivElement | null>>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);
  const drag = useRef({ on: false, id: -1, x0: 0, y0: 0, x: 0, t: 0, px: 0, pt: 0, raf: 0, horiz: false });

  const depthOf = (i: number) => (i - activeIndex + n) % n;

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const clearDrag = (el: HTMLElement | null | undefined) => {
    if (!el) return;
    el.removeAttribute("data-dragging");
    el.style.setProperty("--dx", "0px");
    el.style.setProperty("--dr", "0deg");
  };

  const go = useCallback(
    (dir: "next" | "prev", throwDir: -1 | 1 = -1) => {
      if (busyRef.current) return;
      const cur = activeIndex;
      const next = dir === "next" ? (cur + 1) % n : (cur - 1 + n) % n;
      if (reducedMotion) {
        onNavigate(next);
        return;
      }
      busyRef.current = true;
      if (dir === "next") {
        // 1) la carta in cima parte (transizione verso fuori campo) e il mazzo risale
        setFly({ kind: "out", index: cur, dir: throwDir });
        clearDrag(cardsRef.current[cur]);
        onNavigate(next);
        timerRef.current = window.setTimeout(() => {
          // 2) invisibile: torna in fondo alla pila senza transizione…
          setFly({ kind: "back", index: cur });
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              // 3) …e riappare in dissolvenza.
              setFly(null);
              busyRef.current = false;
            }),
          );
        }, 380);
      } else {
        clearDrag(cardsRef.current[cur]);
        setFly({ kind: "in-start", index: next });
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            setFly(null);
            onNavigate(next);
            timerRef.current = window.setTimeout(() => {
              busyRef.current = false;
            }, 420);
          }),
        );
      }
    },
    [activeIndex, n, onNavigate, reducedMotion],
  );

  /* ------------------------------------------------------------------ drag -- */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (busyRef.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    const now = performance.now();
    drag.current = { on: true, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, t: now, px: e.clientX, pt: now, raf: 0, horiz: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.on || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    if (!d.horiz) {
      const dy = e.clientY - d.y0;
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      d.horiz = true;
      stageRef.current?.setPointerCapture?.(e.pointerId);
      cardsRef.current[activeIndex]?.setAttribute("data-dragging", "");
    }
    d.px = d.x;
    d.pt = d.t;
    d.x = e.clientX;
    d.t = performance.now();
    if (reducedMotion || d.raf) return;
    d.raf = requestAnimationFrame(() => {
      d.raf = 0;
      const el = cardsRef.current[activeIndex];
      if (!el) return;
      const off = d.x - d.x0;
      el.style.setProperty("--dx", `${off}px`);
      el.style.setProperty("--dr", `${off * 0.045}deg`);
    });
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.on || e.pointerId !== d.id) return;
    d.on = false;
    if (d.raf) {
      cancelAnimationFrame(d.raf);
      d.raf = 0;
    }
    const el = cardsRef.current[activeIndex];
    if (!d.horiz) return;
    stageRef.current?.releasePointerCapture?.(e.pointerId);
    const dx = d.x - d.x0;
    const width = stageRef.current?.offsetWidth ?? 340;
    const v = Math.abs(d.x - d.px) / Math.max(1, d.t - d.pt);
    const commit =
      e.type !== "pointercancel" &&
      (Math.abs(dx) / width > THROW_DISTANCE_RATIO || (v > THROW_VELOCITY_PX_MS && Math.abs(dx) > 24));
    if (commit) {
      if (dx < 0) go("next", -1);
      else go("prev");
    } else {
      // sotto soglia: ritorno morbido nel mazzo
      clearDrag(el);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go("next");
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go("prev");
    }
  };

  /* ------------------------------------------------------------ geometria -- */
  const styleFor = (i: number): CSSProperties => {
    const d = depthOf(i);
    const s = SLOT[Math.min(d, SLOT.length - 1)];
    const base = (x: string, y: number, sc: number, r: string) =>
      `translate3d(calc(${x} + var(--dx, 0px)), ${y}px, 0) rotate(calc(${r} + var(--dr, 0deg))) scale(${sc})`;
    const settle = `transform .5s ${EASE_SETTLE}, opacity .35s ease`;

    if (fly?.index === i) {
      if (fly.kind === "out") {
        return {
          transform: base(`${fly.dir * 135}%`, -40, 1, `${fly.dir * 22}deg`),
          opacity: 0,
          zIndex: 60,
          transition: "transform .42s cubic-bezier(.4,0,.8,.6), opacity .3s ease .12s",
        };
      }
      if (fly.kind === "back") {
        return {
          transform: base("0px", SLOT[3].y, SLOT[3].s, `${SLOT[3].r}deg`),
          opacity: 0,
          zIndex: 10,
          transition: "none",
        };
      }
      if (fly.kind === "in-start") {
        return {
          transform: base("125%", -30, 1, "18deg"),
          opacity: 0,
          zIndex: 60,
          transition: "none",
        };
      }
    }
    return {
      transform: base("0px", s.y, s.s, `${s.r}deg`),
      opacity: s.o,
      zIndex: 40 - d * 10,
      transition: reducedMotion ? "none" : settle,
    };
  };

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <span className="min-w-0 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-low)]">
          {ui.deckLabel} · {ui.deckHint}
        </span>
        <span className="shrink-0 font-[family-name:var(--font-mono)] text-[13px] font-medium tracking-[0.1em] tabular-nums">
          <span className="text-[var(--aqua-300)]">{pad(activeIndex + 1)}</span>
          <span className="text-[var(--text-low)]"> / {pad(n)}</span>
        </span>
      </div>

      <div
        ref={stageRef}
        role="group"
        aria-roledescription="deck"
        aria-label={ui.deckAria}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className="relative grid select-none pt-[34px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--aqua-400)]"
        style={{ touchAction: "pan-y" }}
      >
        {phases.map((phase, i) => {
          const d = depthOf(i);
          const active = d === 0;
          return (
            <div
              key={phase.title}
              ref={(el) => {
                cardsRef.current[i] = el;
              }}
              data-phase={pad(i + 1)}
              aria-hidden={!active}
              className="pdm-card relative col-start-1 row-start-1 overflow-hidden rounded-[18px]"
              style={styleFor(i)}
            >
              <PhaseFace phase={phase} index={i} total={n} phaseWord={ui.phaseWord} />
              {/* scrim di profondità: opacità pura, affonda le carte sotto */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[18px] bg-[var(--void)] transition-opacity duration-300"
                style={{ opacity: active ? 0 : Math.min(0.78, 0.4 + d * 0.14) }}
              />
            </div>
          );
        })}
      </div>

      {/* Controlli a portata di pollice: bersagli ≥ 44px, nessun movimento. */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go("prev")}
          aria-label={ui.prev}
          className="pdm-btn"
        >
          <Arrow dir="prev" />
          {ui.prev}
        </button>
        <div className="flex items-center" role="group" aria-label={ui.deckAria}>
          {phases.map((p, i) => {
            const on = i === activeIndex;
            return (
              <button
                key={p.title}
                type="button"
                aria-label={ui.goTo.replace("{n}", String(i + 1))}
                aria-current={on ? "step" : undefined}
                onClick={() => {
                  if (i === activeIndex) return;
                  const fwd = (i - activeIndex + n) % n;
                  if (fwd === 1) go("next");
                  else if (fwd === n - 1) go("prev");
                  else if (!busyRef.current) onNavigate(i);
                }}
                className="flex h-11 w-7 items-center justify-center"
              >
                <span
                  className={cn(
                    "block h-[17px] w-[11px] rounded-[3px] border transition-[background-color,border-color,transform] duration-300",
                    on
                      ? "scale-y-[1.15] border-[var(--aqua-300)] bg-[rgb(var(--aqua-rgb)/0.55)] shadow-[var(--glow-sm)]"
                      : "border-[var(--line-hi)] bg-[rgb(var(--aqua-rgb)/0.05)]",
                  )}
                />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => go("next", -1)}
          aria-label={ui.next}
          className="pdm-btn"
        >
          {ui.next}
          <Arrow dir="next" />
        </button>
      </div>

      <div className="sr-only" aria-live="polite">
        {pad(activeIndex + 1)} / {pad(n)} — {phases[activeIndex]?.title}
      </div>

      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </div>
  );
}

function PhaseFace({
  phase,
  index,
  total,
  phaseWord,
}: {
  phase: PhaseCopy;
  index: number;
  total: number;
  phaseWord: string;
}) {
  const label = pad(index + 1);
  return (
    <div className="relative flex h-full flex-col p-5 pb-4">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-1 bottom-[-0.2em] select-none font-[family-name:var(--font-display)] text-[128px] font-bold leading-[0.72] tracking-[-0.06em]"
        style={{
          backgroundImage:
            "linear-gradient(175deg, rgba(63,233,204,0.15) 0%, rgba(63,233,204,0.04) 55%, rgba(63,233,204,0) 90%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {label}
      </span>

      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[13px] font-medium tracking-[0.12em] tabular-nums text-[var(--aqua-300)]">
          {label}
          <span
            aria-hidden="true"
            className="block h-[7px] w-[7px] rotate-45 rounded-[1px]"
            style={{ background: "linear-gradient(140deg, var(--aqua-300), var(--aqua-600))" }}
          />
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-low)]">
          {phaseWord} {label}/{pad(total)}
        </span>
      </div>

      <h3 className="relative mt-5 font-[family-name:var(--font-display)] text-[24px] font-medium leading-[1.15] tracking-[-0.015em] text-[var(--text-hi)]">
        {phase.title}
      </h3>
      <span
        aria-hidden="true"
        className="relative mt-3 block h-px w-full max-w-[180px]"
        style={{
          background: "linear-gradient(90deg, rgba(63,233,204,0.75), rgba(63,233,204,0.12) 58%, rgba(63,233,204,0) 100%)",
        }}
      />
      <p className="relative mt-3 text-[15px] leading-[1.6] text-[var(--text-mid)] [text-wrap:pretty]">
        {phase.description}
      </p>
      <ul className="relative mt-4 flex flex-wrap gap-2">
        {phase.focus.map((f) => (
          <li
            key={f}
            className="rounded-full border border-[var(--line)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-[var(--text-low)]"
          >
            {f}
          </li>
        ))}
      </ul>

      <div className="relative mt-auto flex items-center gap-1.5 pt-5" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className="block h-[3px] rounded-full"
            style={{
              width: i === index ? 30 : 12,
              background:
                i === index
                  ? "linear-gradient(90deg, var(--aqua-300), var(--aqua-500))"
                  : i < index
                    ? "rgb(var(--aqua-rgb) / 0.42)"
                    : "rgb(var(--aqua-rgb) / 0.13)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={dir === "prev" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M5 12h14m0 0-5-5m5 5-5 5" />
    </svg>
  );
}

const CSS = `
.pdm-card{will-change:transform;
  background:linear-gradient(158deg,rgba(21,38,46,.99) 0%,rgba(11,20,26,.995) 46%,rgba(6,12,16,1) 100%);
  box-shadow:inset 0 1px 0 rgba(223,255,248,.08),0 0 0 1px rgba(63,233,204,.12),0 18px 36px -20px rgba(0,0,0,.95)}
.pdm-card::before{content:"";position:absolute;inset:0 0 auto 0;height:1px;
  background:linear-gradient(90deg,rgba(63,233,204,0),rgba(223,255,248,.5) 22%,rgba(63,233,204,.85) 50%,rgba(223,255,248,.45) 78%,rgba(63,233,204,0))}
.pdm-card[data-dragging]{transition:none!important}
.pdm-btn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:999px;
  border:1px solid var(--line);font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--text-mid);-webkit-tap-highlight-color:transparent;transition:background-color .2s ease,color .2s ease,border-color .2s ease}
.pdm-btn:active{background:rgb(var(--aqua-rgb)/.1);color:var(--aqua-300);border-color:var(--line-hi)}
`;

export default PhaseDeckMobile;
