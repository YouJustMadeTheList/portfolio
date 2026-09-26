"use client";

import { useEffect, useRef } from "react";
import { projectPoint, mulberry32 } from "./neuralGraph";
import { buildPillars } from "./pillarsGraph";
import { heroSceneCopy, type Locale } from "@/content/hero";

type SceneCanvasFallbackProps = {
  reducedMotion: boolean;
  locale?: Locale;
};

function monoFamily(el: HTMLElement) {
  const probe = document.createElement("span");
  probe.style.fontFamily = "var(--font-mono)";
  el.appendChild(probe);
  const fam = getComputedStyle(probe).fontFamily || "monospace";
  probe.remove();
  return fam;
}

const CAM_Z = 3.4;
const POINT_COUNT = 750;
const FORM_DURATION = 2.4;

/**
 * Fallback 2D per dispositivi senza WebGL affidabile (spec §7): disegna LA
 * STESSA rete (stesso generatore, stesso seed) con la Canvas 2D API — nodi,
 * archi pesati, filamenti — a costo trascurabile rispetto a Three.js.
 *
 * Conserva la lettura «caos → struttura» in versione economica: i nodi entrano
 * da posizioni sparse dentro il riquadro (non su tutta la pagina: un canvas 2D
 * a schermo intero su un dispositivo senza WebGL sarebbe esattamente il costo
 * che qui si sta evitando) e gli archi compaiono quando i loro estremi sono
 * atterrati. Reagisce al cursore con una parallasse dell'intera rete invece
 * della fisica per-particella (ART-DIRECTION §5 — niente resta fermo; §7 — se
 * una sezione non regge, si semplifica quella sezione).
 *
 * Sotto `prefers-reduced-motion` è un'immagine statica, disegnata una volta.
 */
export function SceneCanvasFallback({ reducedMotion, locale = "it" }: SceneCanvasFallbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const graph = buildPillars(POINT_COUNT);
    const { nodes, nodeCount, edges, edgeWeights } = graph;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;

    // x, y proiettati + profondità, per nodo
    const projected = new Float32Array(nodeCount * 3);
    // posizione sparsa di partenza (frazioni del riquadro) + ritardo per ondate
    const scatter = new Float32Array(nodeCount * 2);
    const delay = new Float32Array(nodeCount);
    const rand = mulberry32(90210);
    for (let i = 0; i < nodeCount; i++) {
      scatter[i * 2] = rand() * 2 - 1;
      scatter[i * 2 + 1] = rand() * 2 - 1;
      // il ritardo segue la X del nodo: la rete si compone da sinistra a destra,
      // strato dopo strato, come nella versione WebGL
      delay[i] = (nodes[i * 3] * 0.5 + 0.5) * 0.55 + rand() * 0.06;
    }

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      w = Math.max(rect.width, 1);
      h = Math.max(rect.height, 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // la stessa tabella dell'apertura WebGL, ferma e sommessa: anche senza
    // WebGL la rete nasce "dai dati". Solo da lg, dove il riquadro non sta
    // dietro al testo.
    const scene = heroSceneCopy[locale] ?? heroSceneCopy.it;
    const tableLines = [scene.tableCaption, scene.tableHeader, "─".repeat(scene.tableHeader.length), ...scene.tableRows];
    const family = monoFamily(wrap);

    const pointer = { x: 0, y: 0, inside: false };
    const parallax = { x: 0, y: 0 };

    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      pointer.x = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
      pointer.y = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
      pointer.inside = Math.abs(pointer.x) < 1.1 && Math.abs(pointer.y) < 1.1;
    };

    const start = performance.now();
    let raf = 0;
    let visible = true;

    const draw = (now: number) => {
      raf = 0;
      const t = reducedMotion ? 4 : (now - start) / 1000;
      const ry = reducedMotion ? 0.18 : Math.sin(t * 0.16) * 0.3 + (pointer.inside ? parallax.x : 0);
      const rx = reducedMotion ? -0.05 : -0.05 + Math.sin(t * 0.12) * 0.06 + (pointer.inside ? parallax.y : 0);

      parallax.x += ((pointer.inside ? pointer.x * 0.4 : 0) - parallax.x) * 0.06;
      parallax.y += ((pointer.inside ? pointer.y * 0.26 : 0) - parallax.y) * 0.06;

      const form = reducedMotion ? 1 : Math.min(1, Math.max(0, t - 0.4) / FORM_DURATION);
      const scale = Math.min(w, h) * 0.46;

      for (let i = 0; i < nodeCount; i++) {
        const p = projectPoint(
          nodes[i * 3],
          nodes[i * 3 + 1],
          nodes[i * 3 + 2],
          ry,
          rx,
          CAM_Z,
        );
        const local = Math.min(1, Math.max(0, (form - delay[i]) / 0.45));
        const e = local * local * (3 - 2 * local);
        const sx = w / 2 + scatter[i * 2] * w * 0.5;
        const sy = h / 2 + scatter[i * 2 + 1] * h * 0.5;
        projected[i * 3] = sx + (w / 2 + p.x * scale - sx) * e;
        projected[i * 3 + 1] = sy + (h / 2 - p.y * scale - sy) * e;
        projected[i * 3 + 2] = e;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // gli archi: compaiono solo quando ENTRAMBI gli estremi sono atterrati,
      // e il peso si legge dall'opacità
      ctx.lineWidth = 1;
      for (let k = 0; k < edgeWeights.length; k++) {
        const a = edges[k * 2];
        const b = edges[k * 2 + 1];
        const ready = Math.min(projected[a * 3 + 2], projected[b * 3 + 2]);
        if (ready < 0.82) continue;
        const alpha = (0.07 + edgeWeights[k] * 0.26) * ((ready - 0.82) / 0.18);
        ctx.strokeStyle = `rgba(26, 207, 177, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(projected[a * 3], projected[a * 3 + 1]);
        ctx.lineTo(projected[b * 3], projected[b * 3 + 1]);
        ctx.stroke();
      }

      // i nodi
      for (let i = 0; i < nodeCount; i++) {
        const e = projected[i * 3 + 2];
        if (e <= 0.001) continue;
        ctx.fillStyle = `rgba(168, 255, 238, ${(0.28 + e * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(projected[i * 3], projected[i * 3 + 1], 2.1, 0, Math.PI * 2);
        ctx.fill();
        // alone
        ctx.fillStyle = `rgba(63, 233, 204, ${(0.1 * e).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(projected[i * 3], projected[i * 3 + 1], 6.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      if (window.innerWidth >= 1024 && w > 360) {
        ctx.font = `500 11px ${family}`;
        ctx.textBaseline = "top";
        tableLines.forEach((line, i) => {
          const alpha = (i === 0 ? 0.26 : i === 1 ? 0.5 : i === 2 ? 0.18 : 0.34) * Math.min(1, form * 2);
          ctx.fillStyle = `rgba(111, 247, 222, ${alpha.toFixed(3)})`;
          ctx.fillText(line, 8, 6 + i * 17 + (i > 0 ? 6 : 0));
        });
      }

      if (!reducedMotion && visible) raf = requestAnimationFrame(draw);
    };

    draw(start);

    const onResize = () => {
      resize();
      if (!raf) raf = requestAnimationFrame(draw);
    };

    // stessa regola del canvas WebGL: fuori dal viewport non si disegna nulla.
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible && !reducedMotion && !raf) raf = requestAnimationFrame(draw);
      },
      { rootMargin: "120px" },
    );
    io.observe(wrap);

    window.addEventListener("resize", onResize);
    if (!reducedMotion) window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion, locale]);

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          opacity: reducedMotion ? 1 : 0,
          animation: reducedMotion
            ? undefined
            : "hero-net-fade-in 900ms var(--ease-out) 80ms forwards",
        }}
      />
      <style>{`
        @keyframes hero-net-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default SceneCanvasFallback;
