/**
 * Specchio in TS dei design token CSS (app/globals.css) — per usarli in
 * GSAP / Framer Motion / R3F, dove le CSS custom properties non sono leggibili
 * da un tween numerico.
 *
 * Fonte di verità estetica: site-architecture/ART-DIRECTION.md.
 * Tenere sincronizzato a mano con :root.
 */

/* ============================================================
   COLORE — "Liquid Aqua / Deep Void" (ART-DIRECTION §1)
   ============================================================ */
export const colors = {
  /* fondali */
  void: "#03070A",
  base: "#060C10",
  raised: "#0B141A",
  raisedHi: "#111E25",
  glass: "rgba(11, 20, 26, 0.55)",

  /* verde acqua — l'accento identitario */
  aqua100: "#DFFFF8",
  aqua200: "#A8FFEE",
  aqua300: "#6FF7DE",
  aqua400: "#3FE9CC", // ★ accento primario
  aqua500: "#1ACFB1",
  aqua600: "#0FA88F",
  aqua800: "#0A5A4E",
  aqua900: "#063730",

  /* profondità cromatica — solo nei gradienti di fondo, mai nel testo */
  abyss: "#0A2F3F",
  deep: "#071A24",

  /* testo — mai bianco puro */
  textHi: "#E8F6F2",
  textMid: "#8DA6A3",
  textLow: "#5A6E70",

  /* accento caldo — RAZIONATO: max 2 occorrenze in tutto il sito */
  ember: "#FF7A4D",

  /* bordi */
  line: "rgba(63, 233, 204, 0.12)",
  lineHi: "rgba(63, 233, 204, 0.32)",

  stateError: "#FF6B6B",

  /* --- alias v1, rimappati sulla palette v2 (non rimuovere) --- */
  bg: "#03070A",
  bgElevated: "#0B141A",
  textPrimary: "#E8F6F2",
  textSecondary: "#8DA6A3",
  accent: "#3FE9CC",
  accentDim: "rgba(63, 233, 204, 0.35)",
  accentParticle: "#6FF7DE",
} as const;

/** Canali RGB dell'accento, per comporre alpha arbitrarie in JS/WebGL. */
export const aquaRgb = [63, 233, 204] as const;

/* ============================================================
   MOLLE — vocabolario unico per tutto il sito (ART-DIRECTION §4)
   ============================================================ */
export const spring = {
  /** Oscilla VISIBILMENTE. È il "molleggio" chiesto dal cliente. */
  wobble: { type: "spring", stiffness: 420, damping: 9, mass: 0.8 },
  bounce: { type: "spring", stiffness: 340, damping: 14, mass: 0.7 },
  smooth: { type: "spring", stiffness: 260, damping: 26, mass: 0.9 },
  magnetic: { type: "spring", stiffness: 180, damping: 15, mass: 0.6 },
  /** Deriva lenta e senza overshoot: per tilt e magnetismo delle superfici grandi. */
  drift: { type: "spring", stiffness: 60, damping: 18, mass: 1.1 },

  /* --- alias v1 (non rimuovere): mappati sulle molle v2 --- */
  gentle: { type: "spring", stiffness: 260, damping: 26, mass: 0.9 },
  bouncy: { type: "spring", stiffness: 340, damping: 14, mass: 0.7 },
  snappy: { type: "spring", stiffness: 520, damping: 30, mass: 0.5 },
} as const;

/* ============================================================
   KEYFRAME TATTILI (ART-DIRECTION §5)
   Usati da components/ui/Tactile.tsx. Esportati perché una sezione possa
   riprodurre lo stesso molleggio su un elemento che non può usare Tactile.
   ============================================================ */

/**
 * A — oscillazione smorzata all'ingresso del cursore, si esaurisce in ~600ms.
 *
 * SOLO SU ELEMENTI DECORATIVI (ART-DIRECTION §5.1). Su un bottone, un link, una
 * freccia di carousel o qualunque altra area di click la rotazione sposta il
 * bersaglio sotto il cursore e lo fa mancare: lì va usata `calmHover`.
 */
export const wobbleKeyframes = {
  // v3 — "lentino, leggero e armonioso" (revisione del cliente): un respiro,
  // non un tremito. Un solo mezzo periodo di rotazione appena percettibile e
  // un rigonfiamento morbido, distribuiti su ~1.2s con easing sinusoidale.
  rotate: [0, -0.6, 0.35, 0],
  scale: [1, 1.014, 1.004, 1],
} as const;

/** D — squash al tap: scaleX e scaleY sfasati, deformazione fisica reale. */
export const squashKeyframes = {
  // v3 — pressione morbida, niente rimbalzo nervoso.
  scaleX: [1, 1.018, 1],
  scaleY: [1, 0.972, 1],
} as const;

/**
 * A′ — risposta CALMA, riservata agli elementi CLICCABILI (ART-DIRECTION §5).
 *
 * Il wobble ruota e oscilla: su un bersaglio da colpire col mouse si legge come
 * instabilità e fa mancare il click. Al suo posto, sui cliccabili: un sollevamento
 * costante di pochi px + un aumento di luminosità. Nessuna rotazione, nessuna
 * oscillazione, nessuno spostamento del bersaglio sotto il cursore.
 */
export const calmHover = {
  /** Sollevamento in px (verso l'alto), moltiplicato per l'ampiezza dell'intensità. */
  lift: 3,
  /** Guadagno di luminosità in hover — il "glow" che sostituisce il molleggio. */
  brightness: 1.08,
  /** Durata della transizione di luminosità, in secondi. */
  duration: 0.22,
} as const;

/** Durate dei keyframe tattili, in secondi. */
export const tactileDuration = {
  wobble: 1.25,
  squash: 0.42,
} as const;

/* ============================================================
   EASING
   ============================================================ */
export const easing = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  inout: "cubic-bezier(0.65, 0, 0.35, 1)",
  in: "cubic-bezier(0.55, 0, 1, 0.45)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  wobble: "cubic-bezier(0.22, 1.4, 0.36, 1)",
} as const;

/** Equivalenti named per GSAP, che li preferisce alle bezier esplicite. */
export const gsapEase = {
  out: "power3.out",
  inout: "power2.inOut",
  spring: "back.out(1.9)",
  elastic: "elastic.out(1, 0.45)",
} as const;

/* ============================================================
   DURATE (secondi — unità di GSAP/Framer) e REVEAL
   ============================================================ */
export const duration = {
  instant: 0.12,
  micro: 0.18,
  base: 0.3,
  slow: 0.52,
  reveal: 0.7,
} as const;

/** Reveal allo scroll (ART-DIRECTION §4). */
export const reveal = {
  /** Titoli: per parola, dentro una maschera overflow:hidden. */
  word: { yPercent: 110, duration: 0.85, stagger: 0.045, ease: "power3.out" },
  /** Paragrafi e card. */
  block: {
    y: 28,
    opacity: 0,
    filter: "blur(6px)",
    duration: 0.7,
    ease: "power3.out",
  },
  /** Config ScrollTrigger condivisa: sempre once, sempre top 80%. */
  trigger: { start: "top 80%", once: true },
} as const;

/* ============================================================
   GEOMETRIA
   ============================================================ */
export const radius = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 32,
  full: 999,
} as const;

/** Limiti condivisi per i wrapper magnetici e i tilt. */
export const tactileLimits = {
  magneticStrength: 0.18,
  magneticMax: 10,
  tiltMax: 6,
  tiltPerspective: 1000,
} as const;
