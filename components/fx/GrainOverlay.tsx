"use client";

/**
 * L3 — Grana filmica (ART-DIRECTION §3).
 *
 * Overlay fisso a tutta pagina con noise SVG (`feTurbulence baseFrequency=.8`),
 * `opacity .04`, `mix-blend-mode: overlay`, `pointer-events: none`.
 * Da solo trasforma il nero digitale in nero fotografico.
 *
 * Statica di proposito: animare la grana costa e dà fastidio.
 * Il noise è inline come data-URI, così non c'è nessuna richiesta di rete
 * e la texture è disponibile al primo paint.
 */

const NOISE = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>\
<filter id='n'>\
<feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/>\
<feColorMatrix type='saturate' values='0'/>\
</filter>\
<rect width='100%' height='100%' filter='url(#n)'/>\
</svg>`;

const NOISE_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(NOISE)}")`;

export function GrainOverlay({ opacity = 0.04 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-grain)",
        pointerEvents: "none",
        opacity,
        mixBlendMode: "overlay",
        backgroundImage: NOISE_URL,
        backgroundRepeat: "repeat",
        backgroundSize: "220px 220px",
        willChange: "auto",
      }}
    />
  );
}

export default GrainOverlay;
