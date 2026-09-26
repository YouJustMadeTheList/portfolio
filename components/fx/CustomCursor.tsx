"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/**
 * Cursore custom (ART-DIRECTION §5).
 *
 * - punto aqua 6px che segue il cursore ISTANTANEAMENTE
 * - anello 34px che lo insegue con lerp 0.15
 * - sopra un elemento interattivo l'anello va a 56px, si riempie di
 *   rgba(63,233,204,.1) e il punto sparisce
 * - sopra un elemento trascinabile ([data-cursor="drag"]) l'anello mostra ↔
 * - `mix-blend-mode: difference` per restare leggibile su ogni fondo
 * - esiste SOLO su desktop con puntatore fine; su touch non viene montato
 * - disattivato sotto prefers-reduced-motion
 *
 * Marcatura opzionale per gli altri agenti:
 *   data-cursor="drag"  → anello con ↔
 *   data-cursor="text"  → anello sottile, barra verticale
 *   data-cursor="none"  → nessuna reazione (l'anello resta a riposo)
 * Bottoni, link, input, [role=button] e .cursor-hover sono già rilevati da soli.
 */

type CursorMode = "idle" | "hover" | "drag" | "text";

const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, summary, [role="button"], [role="link"], [data-cursor], .cursor-hover';

export function CustomCursor() {
  const reduced = usePrefersReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<CursorMode>("idle");
  const [down, setDown] = useState(false);
  const [visible, setVisible] = useState(false);

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // il puntatore fine esiste? (deciso solo lato client, così l'SSR non monta nulla)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(pointer: fine)");
    const apply = () => setEnabled(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  const active = enabled && !reduced;

  // nasconde il puntatore di sistema solo quando il nostro è davvero vivo
  useEffect(() => {
    if (!active) return;
    document.documentElement.classList.add("has-custom-cursor");
    return () => document.documentElement.classList.remove("has-custom-cursor");
  }, [active]);

  useEffect(() => {
    if (!active) return;

    let raf = 0;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) setVisible(true);

      const target = e.target as Element | null;
      const hit = target?.closest?.(INTERACTIVE_SELECTOR) as HTMLElement | null;
      if (!hit) {
        setMode("idle");
        return;
      }
      const flag = hit.dataset.cursor;
      if (flag === "none") setMode("idle");
      else if (flag === "drag") setMode("drag");
      else if (flag === "text") setMode("text");
      else setMode("hover");
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);

    const tick = () => {
      // punto: istantaneo. anello: lerp 0.15.
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
    };
    // `visible` volutamente fuori dalle deps: viene solo settato, non letto nel ciclo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  const ringSize = mode === "idle" ? 34 : mode === "text" ? 26 : 56;
  const pressScale = down ? 0.86 : 1;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-cursor)",
        pointerEvents: "none",
        mixBlendMode: "difference",
        opacity: visible ? 1 : 0,
        transition: "opacity 220ms var(--ease-out)",
      }}
    >
      {/* anello inseguitore */}
      <div
        ref={ringRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: ringSize,
          height: ringSize,
          borderRadius: "999px",
          border: `1px solid var(--aqua-400)`,
          background:
            mode === "idle" ? "transparent" : "rgba(63, 233, 204, 0.1)",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          lineHeight: 1,
          color: "var(--aqua-200)",
          willChange: "transform",
          transition: `width 320ms var(--ease-spring), height 320ms var(--ease-spring), background 220ms var(--ease-out), scale 160ms var(--ease-out)`,
          scale: String(pressScale),
        }}
      >
        {mode === "drag" ? "↔" : null}
      </div>

      {/* punto istantaneo */}
      <div
        ref={dotRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 6,
          height: 6,
          borderRadius: "999px",
          background: "var(--aqua-400)",
          boxShadow: "var(--glow-xs)",
          willChange: "transform",
          opacity: mode === "idle" ? 1 : 0,
          transition: "opacity 180ms var(--ease-out)",
        }}
      />
    </div>
  );
}

export default CustomCursor;
