/**
 * Fondo statico: gradienti di profondità + campo di punti aqua fermo, solo CSS.
 * È il fallback del BackgroundShader (reduced motion / niente WebGL) e il fondo
 * della variante mobile, che non monta alcun WebGL globale. Nessun JS: modulo
 * separato perché il bundle mobile non si porti dietro il canvas three.js.
 */
/** Fondo statico (gradienti + campo di punti fermo), usato dalla variante mobile. */
export function BackgroundStatic() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-shader)",
        pointerEvents: "none",
        contain: "layout paint style",
      }}
    >
      <StaticFallback />
    </div>
  );
}

export function StaticFallback() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          backgroundImage: [
            "radial-gradient(60% 50% at 18% 14%, rgba(10,47,63,0.9), rgba(10,47,63,0) 70%)",
            "radial-gradient(55% 45% at 84% 62%, rgba(6,55,48,0.75), rgba(6,55,48,0) 70%)",
            "radial-gradient(45% 40% at 52% 96%, rgba(7,26,36,0.9), rgba(7,26,36,0) 70%)",
          ].join(","),
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.4,
          backgroundImage: [
            "radial-gradient(1.5px 1.5px at 23px 31px, rgba(111,247,222,0.55), rgba(111,247,222,0) 60%)",
            "radial-gradient(1px 1px at 97px 73px, rgba(63,233,204,0.4), rgba(63,233,204,0) 60%)",
            "radial-gradient(2px 2px at 151px 19px, rgba(168,255,238,0.35), rgba(168,255,238,0) 60%)",
            "radial-gradient(1px 1px at 61px 137px, rgba(63,233,204,0.3), rgba(63,233,204,0) 60%)",
          ].join(","),
          backgroundSize: "181px 173px, 149px 211px, 233px 257px, 127px 163px",
        }}
      />
    </div>
  );
}

