"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap, ensureGsapRegistered } from "@/lib/animation/gsap";

type StitchUnderlineProps = {
  reducedMotion: boolean;
  /** Sincronizzato dalla timeline madre di HeroContent (spec 01-hero §5). */
  startDelayMs: number;
  /** Chiamato a fine cucitura — HeroContent lo usa per incatenare la positioning line. */
  onComplete?: () => void;
  /**
   * Il titolo è "sfasciato" (le lettere sono sparse, vedi HeroHeadline): il filo
   * resta dov'è — è lui a tenere insieme la frase, ed è a lui che le lettere
   * tornano — ma si fa da parte, perché non sta più cucendo niente.
   */
  dim?: boolean;
};

/* ============================================================================
   Il filo che cuce — versione v2
   ----------------------------------------------------------------------------
   Resta il "punto di cucito" dello spec (tratteggio 5/4, punta d'ago che precede
   la testa), ma smette di sembrare una linea tratteggiata che scorre:

   1. il tratteggio è FISSO e a scoprirlo è una maschera che avanza da sinistra
      a destra — i punti non slittano, compaiono. È così che si legge "cucito";
   2. il filo parte LENTO (allentato: ondulazione ampia) e a fine corsa viene
      TIRATO IN TENSIONE — l'ampiezza dell'onda collassa con un rimbalzo
      elastico. È il gesto di stringere il punto;
   3. glow aqua vero (drop-shadow sul tratto + alone sulla punta dell'ago);
   4. al passaggio del cursore sulla frase, il filo si fa PIZZICARE: oscilla e
      si riassesta (ART-DIRECTION §5 — niente che il cursore tocca resta fermo).

   Si auto-misura con un ResizeObserver: il path segue sempre la larghezza reale
   della frase renderizzata, che in IT e in EN è diversa (checklist §9).
   ========================================================================== */

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const HEIGHT = 14;
const DRAW_DURATION = 0.95;

/** Il tracciato: due onde, con l'ampiezza governata da `slack` (1 = lento, 0 = teso). */
function threadPath(width: number, slack: number) {
  if (width <= 0) return "";
  const mid = HEIGHT * 0.5;
  const a = 3.1 * slack; // ampiezza dell'ondulazione, in px
  return [
    `M 1 ${mid}`,
    `C ${width * 0.22} ${mid - a}, ${width * 0.36} ${mid + a}, ${width * 0.5} ${mid}`,
    `S ${width * 0.78} ${mid + a * 1.15}, ${width - 1} ${mid}`,
  ].join(" ");
}

export function StitchUnderline({
  reducedMotion,
  startDelayMs,
  onComplete,
  dim = false,
}: StitchUnderlineProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const revealRef = useRef<SVGRectElement>(null);
  const needleRef = useRef<SVGCircleElement>(null);
  const slackRef = useRef({ value: 1 });
  const [width, setWidth] = useState(0);

  useIsoLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = (w: number) => {
      if (w > 0) setWidth((prev) => (Math.abs(prev - w) > 0.5 ? Math.round(w) : prev));
    };
    const ro = new ResizeObserver((entries) => measure(entries[0]?.contentRect.width ?? 0));
    ro.observe(el);
    measure(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  /* --- disegno + tensione --- */
  useEffect(() => {
    const path = pathRef.current;
    const rect = revealRef.current;
    if (!width || !path || !rect) return;

    if (reducedMotion) {
      // Spec §7: filo già completo, nessuna animazione di disegno, nessun ago.
      slackRef.current.value = 0.35;
      path.setAttribute("d", threadPath(width, 0.35));
      rect.setAttribute("width", `${width + 8}`);
      if (needleRef.current) needleRef.current.style.opacity = "0";
      onComplete?.();
      return;
    }

    ensureGsapRegistered();
    slackRef.current.value = 1;
    path.setAttribute("d", threadPath(width, 1));
    rect.setAttribute("width", "0");

    const state = { progress: 0 };
    const tl = gsap.timeline({ delay: startDelayMs / 1000 });

    tl.to(state, {
      progress: 1,
      duration: DRAW_DURATION,
      ease: "power2.inOut",
      onUpdate: () => {
        const p = state.progress;
        rect.setAttribute("width", `${width * p + 8}`);
        const needle = needleRef.current;
        if (needle) {
          const len = path.getTotalLength();
          const pt = path.getPointAtLength(len * p);
          needle.setAttribute("cx", `${pt.x}`);
          needle.setAttribute("cy", `${pt.y}`);
          needle.style.opacity = p > 0.02 && p < 0.995 ? "1" : "0";
        }
      },
    })
      // il filo viene tirato: l'onda si appiattisce con un rimbalzo
      .to(
        slackRef.current,
        {
          value: 0.32,
          duration: 0.7,
          ease: "elastic.out(1, 0.55)",
          onUpdate: () => path.setAttribute("d", threadPath(width, slackRef.current.value)),
        },
        `-=${DRAW_DURATION * 0.35}`,
      )
      .add(() => onComplete?.());

    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, reducedMotion, startDelayMs]);

  /* --- pizzico: il cursore sulla frase fa vibrare il filo --- */
  useEffect(() => {
    const path = pathRef.current;
    const host = wrapRef.current?.parentElement;
    if (!path || !host || reducedMotion || !width) return;

    let tween: ReturnType<typeof gsap.to> | null = null;
    const pluck = () => {
      tween?.kill();
      slackRef.current.value = 1.5;
      tween = gsap.to(slackRef.current, {
        value: 0.32,
        duration: 1.1,
        ease: "elastic.out(1.6, 0.28)",
        onUpdate: () => path.setAttribute("d", threadPath(width, slackRef.current.value)),
      });
    };

    host.addEventListener("pointerenter", pluck);
    return () => {
      host.removeEventListener("pointerenter", pluck);
      tween?.kill();
    };
  }, [reducedMotion, width]);

  const maskId = `stitch-mask-${width}`;

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "-0.06em",
        height: HEIGHT,
        pointerEvents: "none",
        opacity: dim ? 0.32 : 1,
        transition: "opacity 320ms var(--ease-out)",
      }}
    >
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          style={{
            overflow: "visible",
            display: "block",
            filter: "drop-shadow(0 0 6px rgba(63, 233, 204, 0.55))",
          }}
        >
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse">
              <rect
                ref={revealRef}
                x={-4}
                y={-HEIGHT}
                width={0}
                height={HEIGHT * 3}
                fill="#fff"
              />
            </mask>
          </defs>

          {/* il punto di cucito: tratteggio FISSO, scoperto dalla maschera */}
          <path
            ref={pathRef}
            d={threadPath(width, 1)}
            fill="none"
            stroke="var(--aqua-400)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeDasharray="5 4"
            mask={`url(#${maskId})`}
          />

          {/* la punta dell'ago che precede la testa del tratto */}
          <circle
            ref={needleRef}
            r={2.6}
            fill="var(--aqua-200)"
            style={{
              opacity: 0,
              filter: "drop-shadow(0 0 5px rgba(63, 233, 204, 0.95))",
              transition: "opacity 140ms linear",
            }}
          />
        </svg>
      )}
    </div>
  );
}

export default StitchUnderline;
