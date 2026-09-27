"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { smoothScrollTo } from "@/components/fx/scrollTo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroHeadline } from "./HeroHeadline";
import { heroCopy, type Locale } from "@/content/hero";
import type { MobileScene } from "./mobileScene";

// Solo senza WebGL: il fallback 2D (stesso grafo, Canvas 2D). Mai nel bundle
// iniziale.
const SceneCanvasFallback = dynamic(
  () => import("./SceneCanvasFallback").then((m) => m.SceneCanvasFallback),
  { ssr: false, loading: () => null },
);

/* ============================================================================
   HERO — VARIANTE MOBILE (telefoni; i tablet ricevono la desktop)
   ----------------------------------------------------------------------------
   Prima le prestazioni, poi la bellezza:

   · Il testo È il primo paint. Il titolo entra con un'animazione CSS che parte
     dall'HTML del server — nessun JS da aspettare, nessun "testo che sparisce
     e ricompare" all'idratazione. LCP = il titolo, non la scena.
   · La scena (mobileScene.ts: WebGL puro, niente three/R3F) si scarica e si
     crea DOPO il primo paint, in un momento d'ozio del main thread (idle con
     timeout). Un solo canvas, dpr ≤ 1 (1.25 sui telefoni di fascia alta),
     ~830 glifi, zero passate extra.
   · Il canvas è `position: absolute` DENTRO la sezione: scorre col compositor,
     nessun listener di scroll. Si ferma fuori schermo e a scheda nascosta.
   · `pointer-events: none` ovunque sulla scena: lo scroll verticale non passa
     mai da lei. Il tap su un nodo è un `click` su window (il browser non lo
     emette dopo uno scroll).
   · Titolo + CTA primaria dentro il primo schermo (100svh) da 360px in su.
   · Reduced motion: un fotogramma composto, statico (niente loop).
   ========================================================================== */

// Il reveal del titolo (s) — corto: su un telefono la prima cosa che si legge
// deve arrivare subito. Il filo sotto "cucio su misura" parte a titolo fermo.
const T = { line1: 0.05, line2: 0.14, line3: 0.23, stitchMs: 900 } as const;

const STYLES = `
.hm .hh-h1 {
  font-size: clamp(2.05rem, 1.2rem + 4.2vw, 2.6rem) !important;
  line-height: 1.0 !important;
  margin-top: 0.9rem !important;
}
.hm .hh-controls { margin-top: 0.7rem; }
@keyframes hm-rise { from { transform: translateY(108%); } to { transform: none; } }
.hm .hh-line .hh-wi { animation: hm-rise .75s cubic-bezier(.2,.8,.2,1) both; }
.hm .hh-line:nth-child(1) .hh-wi { animation-delay: ${T.line1}s; }
.hm .hh-line:nth-child(2) .hh-wi { animation-delay: ${T.line2}s; }
.hm .hh-line:nth-child(3) .hh-wi { animation-delay: ${T.line3}s; }
@keyframes hm-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.hm-in { animation: hm-up .55s cubic-bezier(.2,.8,.2,1) both; animation-delay: var(--d, 0s); }
.hm-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block;
  opacity: 0; transition: opacity .35s ease-out; }
.hm-canvas[data-on="1"] { opacity: 1; }

/* --- il lampo dell'esplosione (stesso gesto della desktop, misure da telefono) --- */
.hmf { position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none; }
.hmf > span {
  position: absolute; left: 0; top: 0; border-radius: 50%;
  transform: translate(-50%, -50%) scale(0); opacity: 0;
  animation-delay: var(--hf-delay, 0s); animation-fill-mode: both;
}
.hmf > .hmf-pre, .hmf > .hmf-in, .hmf > .hmf-dim { animation-delay: var(--hf-pre-delay, 0s); }
.hmf-pre { width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(223,255,248,.85) 0%, rgba(111,247,222,.42) 16%, rgba(63,233,204,.1) 42%, rgba(63,233,204,0) 68%); }
.hmf-in { width: 170px; height: 170px; border: 1px solid rgba(111,247,222,.5);
  box-shadow: 0 0 14px rgba(63,233,204,.28), inset 0 0 14px rgba(63,233,204,.2); }
.hmf-dim { width: 1500px; height: 1500px;
  background: radial-gradient(circle, rgba(3,7,10,0) 0%, rgba(3,7,10,0) 10%, rgba(3,7,10,.5) 34%, rgba(3,7,10,.5) 100%); }
.hmf-core { width: 260px; height: 260px;
  background: radial-gradient(circle, rgba(223,255,248,.92) 0%, rgba(111,247,222,.5) 12%, rgba(63,233,204,.16) 36%, rgba(63,233,204,0) 66%); }
.hmf-ring { width: 150px; height: 150px; border: 1px solid rgba(168,255,238,.75);
  box-shadow: 0 0 20px 2px rgba(63,233,204,.4), inset 0 0 20px rgba(63,233,204,.3); }
.hmf-wash { width: 900px; height: 900px;
  background: radial-gradient(circle, rgba(63,233,204,.14) 0%, rgba(10,47,63,.12) 36%, rgba(3,7,10,0) 68%); }
.hmf-go .hmf-pre  { animation: hf-pre  var(--hf-pre-dur, .45s) cubic-bezier(.55,0,.9,.4) var(--hf-pre-delay, 0s) both; }
.hmf-go .hmf-in   { animation: hf-in   var(--hf-pre-dur, .45s) cubic-bezier(.6,0,.9,.5) var(--hf-pre-delay, 0s) both; }
.hmf-go .hmf-dim  { animation: hf-dim  1.2s ease-in-out var(--hf-pre-delay, 0s) both; }
.hmf-go .hmf-core { animation: hf-core .9s cubic-bezier(.16,1,.3,1) var(--hf-delay, 0s) both; }
.hmf-go .hmf-ring { animation: hf-ring 1s cubic-bezier(.1,.9,.2,1) var(--hf-delay, 0s) both; }
.hmf-go .hmf-wash { animation: hf-wash 1.6s cubic-bezier(.2,.8,.2,1) var(--hf-delay, 0s) both; }
@keyframes hf-pre {
  0%   { opacity: 0;   transform: translate(-50%,-50%) scale(1.5); }
  35%  { opacity: .35; }
  93%  { opacity: .95; transform: translate(-50%,-50%) scale(.24); }
  100% { opacity: 0;   transform: translate(-50%,-50%) scale(.2); }
}
@keyframes hf-in {
  0%   { opacity: 0;  transform: translate(-50%,-50%) scale(3.4); }
  30%  { opacity: .5; }
  100% { opacity: 0;  transform: translate(-50%,-50%) scale(.1); }
}
@keyframes hf-dim {
  0%   { opacity: 0;   transform: translate(-50%,-50%); }
  46%  { opacity: .7;  transform: translate(-50%,-50%); }
  100% { opacity: 0;   transform: translate(-50%,-50%); }
}
@keyframes hf-core {
  0%   { opacity: 0; transform: translate(-50%,-50%) scale(.04); }
  9%   { opacity: 1; transform: translate(-50%,-50%) scale(.5); }
  100% { opacity: 0; transform: translate(-50%,-50%) scale(2.1); }
}
@keyframes hf-ring {
  0%   { opacity: .95; transform: translate(-50%,-50%) scale(.04); }
  100% { opacity: 0;   transform: translate(-50%,-50%) scale(8.5); }
}
@keyframes hf-wash {
  0%   { opacity: 0; transform: translate(-50%,-50%) scale(.25); }
  14%  { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%,-50%) scale(1.15); }
}

/* --- i satelliti del nodo aperto --- */
.hms-layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.hms { position: absolute; left: 0; top: 0; width: 0; height: 0; }
.hms-lines { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: visible; }
.hms-lines line { stroke: rgba(111,247,222,.55); stroke-width: 1; stroke-dasharray: 140; stroke-dashoffset: 140;
  transition: stroke-dashoffset .45s cubic-bezier(.2,.8,.2,1); }
.hms.is-open .hms-lines line { stroke-dashoffset: 0; }
.hms-sat { position: absolute; left: 0; top: 0; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px;
  border-radius: 50%; background: var(--aqua-200); box-shadow: 0 0 10px rgba(63,233,204,.85);
  opacity: 0; transform: translate(0, 0) scale(.2);
  transition: transform .5s cubic-bezier(.34,1.56,.64,1), opacity .25s ease-out; }
.hms.is-open .hms-sat { opacity: 1; transform: translate(var(--x), var(--y)) scale(1); }
.hms-label { position: absolute; top: 50%; left: 13px; transform: translateY(-50%);
  font: 500 11px/1 var(--font-mono); letter-spacing: .04em; white-space: nowrap;
  color: var(--aqua-100); text-shadow: 0 0 8px rgba(3,7,10,.9), 0 0 10px rgba(63,233,204,.45); }
.hms-label[data-side="l"] { left: auto; right: 13px; }
.hms-head { position: absolute; left: 0; top: 0; transform: translate(-50%, -30px);
  font: 500 10px/1 var(--font-mono); letter-spacing: .1em; white-space: nowrap; color: var(--text-mid);
  opacity: 0; transition: opacity .3s ease-out .1s; text-shadow: 0 0 8px rgba(3,7,10,.9); }
.hms-head[data-up="0"] { transform: translate(-50%, 20px); }
.hms.is-open .hms-head { opacity: 1; }

@media (prefers-reduced-motion: reduce) {
  .hm .hh-line .hh-wi, .hm-in { animation: none; }
  .hm-canvas, .hms-sat, .hms-head, .hms-lines line { transition: none; }
}
`;

type SceneMode = "idle" | "webgl" | "fallback";

/** Telefoni di fascia alta: dpr 1.25. Tutti gli altri: 1. */
function dprCap(): number {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = navigator.hardwareConcurrency || 4;
  const mem = nav.deviceMemory;
  return cores >= 6 && (mem === undefined || mem >= 6) ? 1.25 : 1;
}

export function HeroMobile() {
  const locale = useLocale() as Locale;
  const copy = heroCopy[locale];
  const reducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const satRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<SceneMode>("idle");
  const [settled, setSettled] = useState(false);

  /* --- la scena: dopo il primo paint, in un momento d'ozio --- */
  useEffect(() => {
    let cancelled = false;
    let scene: MobileScene | null = null;
    let io: IntersectionObserver | null = null;
    let inView = true;
    let idleId = 0;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const sync = () => scene?.setActive(inView && !document.hidden);
    const onVis = () => sync();

    const boot = async () => {
      let mod: typeof import("./mobileScene");
      try {
        mod = await import("./mobileScene");
      } catch {
        if (!cancelled) setMode("fallback");
        return;
      }
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      try {
        scene = mod.createMobileScene({
          canvas,
          locale,
          flash: flashRef.current,
          satLayer: satRef.current,
          reducedMotion,
          dprCap: dprCap(),
          onSettled: () => {
            if (!cancelled) setSettled(true);
          },
        });
      } catch {
        scene = null;
      }
      if (!scene) {
        setMode("fallback");
        return;
      }
      setMode("webgl");
      if (reducedMotion) setSettled(true);
      const section = sectionRef.current;
      if (section) {
        io = new IntersectionObserver(
          (entries) => {
            inView = entries[0]?.isIntersecting ?? true;
            sync();
          },
          { rootMargin: "60px" },
        );
        io.observe(section);
      }
      document.addEventListener("visibilitychange", onVis);
      sync();
    };

    // 1. lasciare dipingere il testo; 2. aspettare l'ozio (con un tetto)
    const delay = window.setTimeout(
      () => {
        if (w.requestIdleCallback) idleId = w.requestIdleCallback(() => void boot(), { timeout: 900 });
        else idleId = window.setTimeout(() => void boot(), 0);
      },
      reducedMotion ? 0 : 380,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(delay);
      if (w.cancelIdleCallback && idleId) w.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      scene?.destroy();
      scene = null;
      setMode("idle");
      setSettled(false);
    };
  }, [locale, reducedMotion]);

  // niente Lenis su mobile: smoothScrollTo usa lo scroll nativo
  const goTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) smoothScrollTo(el, -72);
  }, []);

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="hm relative isolate w-full overflow-hidden"
      style={{ minHeight: "100svh" }}
    >
      <style>{STYLES}</style>

      {/* --- LA SCENA: il primo schermo, dietro al testo --- */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0"
        style={{ height: "100svh", touchAction: "auto" }}
      >
        {/* alone statico: tiene il posto della nebulosa prima (e sotto) la scena */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(46% 34% at 50% 66%, rgba(63,233,204,0.10), rgba(10,47,63,0.16) 55%, transparent 78%)",
          }}
        />
        <div ref={flashRef} className="hmf">
          <span className="hmf-dim" />
          <span className="hmf-pre" />
          <span className="hmf-in" />
          <span className="hmf-wash" />
          <span className="hmf-core" />
          <span className="hmf-ring" />
        </div>
        {mode === "fallback" ? (
          <div className="absolute inset-x-[3%] bottom-[2%] top-[22%]">
            <SceneCanvasFallback reducedMotion={reducedMotion} locale={locale} />
          </div>
        ) : (
          <canvas ref={canvasRef} className="hm-canvas" data-on={mode === "webgl" ? "1" : undefined} />
        )}
        {/* scrim: contrasto AA del testo che passa sopra la nebulosa */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(3,7,10,0.5) 0%, rgba(3,7,10,0.58) 26%, rgba(3,7,10,0.4) 52%, rgba(3,7,10,0.08) 72%, rgba(3,7,10,0) 84%)",
          }}
        />
        <div ref={satRef} className="hms-layer" />
      </div>

      <div
        className="relative z-10 mx-auto w-full px-5"
        style={{ paddingTop: "calc(var(--nav-h) + 1.1rem)", paddingBottom: "2.5rem" }}
      >
        <span className="eyebrow hm-in" style={{ ["--d" as string]: "0s" }}>
          {copy.eyebrow}
        </span>

        <HeroHeadline copy={copy} reducedMotion={reducedMotion} timing={T} revealMode="css" />

        <p
          className="hm-in relative mt-4"
          style={{
            ["--d" as string]: "0.28s",
            fontFamily: "var(--font-body)",
            fontSize: "1.02rem",
            lineHeight: 1.5,
            fontWeight: 500,
            color: "var(--text-hi)",
            maxWidth: "36ch",
            paddingLeft: 14,
            textWrap: "pretty",
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 block h-full w-px"
            style={{ background: "linear-gradient(to bottom, var(--aqua-400), rgba(63,233,204,0.15))" }}
          />
          {copy.positioningLine}
        </p>

        <div className="hm-in mt-6 flex flex-col gap-3" style={{ ["--d" as string]: "0.38s" }}>
          <Button variant="primary" size="lg" onClick={() => goTo("progetti")} className="w-full">
            {copy.ctaPrimary}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => goTo("contatti")} className="w-full">
            {copy.ctaSecondary}
          </Button>
        </div>

        {/* sotto la piega: i dati e il badge, poi la didascalia della nebulosa */}
        <div
          className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-micro)",
            letterSpacing: "var(--ls-micro)",
            textTransform: "uppercase",
            color: "var(--text-mid)",
          }}
        >
          {copy.subHeadlineParts.map((part, i) => (
            <span key={part} className="inline-flex items-center gap-3">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  style={{ width: 4, height: 4, borderRadius: 9999, background: "var(--aqua-600)", flex: "none" }}
                />
              )}
              <span>{part}</span>
            </span>
          ))}
        </div>

        <div className="mt-6 inline-block">
          <Badge>
            <span
              className="tabular-nums"
              style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", fontWeight: 500, color: "var(--aqua-300)" }}
            >
              {copy.ageBadgeNumber}
            </span>
            <span>{copy.ageBadgeText}</span>
          </Badge>
        </div>

        <p
          className="mt-8"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.66rem",
            lineHeight: 1.6,
            letterSpacing: "0.08em",
            color: "var(--text-low)",
          }}
        >
          <span className="text-[var(--text-mid)]">{copy.pillarsCaption}</span>
          <span className="opacity-80"> · {copy.pillarsCredit}</span>
          {mode === "webgl" && settled && <span className="block opacity-80">{copy.pillarsTapHint}</span>}
        </p>
      </div>
    </section>
  );
}

export default HeroMobile;
