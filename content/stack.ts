// Sezione "Sotto il cofano" — colophon tecnico del sito.
// Ogni voce descrive cosa il sito usa DAVVERO (package.json + codice): se lo
// stack cambia, questo file va aggiornato insieme al codice, non dopo.

export type Locale = "it" | "en";

export type StackItem = {
  id: string;
  title: Record<Locale, string>;
  body: Record<Locale, string>;
  /** Nomi propri, resi in mono: non si traducono. */
  tools: string[];
};

export const stackIntro: {
  eyebrow: Record<Locale, string>;
  title: Record<Locale, string>;
  subtitle: Record<Locale, string>;
} = {
  eyebrow: { it: "Sotto il cofano", en: "Under the hood" },
  title: {
    it: "Come è fatto ⟨questo sito⟩.",
    en: "How ⟨this site⟩ is built.",
  },
  subtitle: {
    it: "Nessun template, nessun page builder. L'ho scritto riga per riga con lo stesso rigore che porto nei progetti dei clienti: poche dipendenze scelte bene, shader scritti a mano, e un budget di performance che non si negozia.",
    en: "No template, no page builder. I wrote it line by line with the same rigor I bring to client work: a few well-chosen dependencies, hand-written shaders, and a performance budget that isn't up for negotiation.",
  },
};

export const stackItems: StackItem[] = [
  {
    id: "foundation",
    title: { it: "Fondamenta", en: "Foundation" },
    body: {
      it: "App Router con rendering server-first: il JavaScript arriva solo dove c'è davvero interazione. TypeScript in modalità strict, dal copy ai dati dei grafici.",
      en: "App Router with server-first rendering: JavaScript ships only where there is real interaction. TypeScript in strict mode, from copy to chart data.",
    },
    tools: ["Next.js 16", "React 19", "TypeScript"],
  },
  {
    id: "design-system",
    title: { it: "Design system", en: "Design system" },
    body: {
      it: "Palette, scala tipografica fluida, vetro e bagliori definiti una volta come token CSS. Quattro famiglie di font servite dal sito stesso.",
      en: "Palette, fluid type scale, glass and glow defined once as CSS tokens. Four font families served by the site itself.",
    },
    tools: ["Tailwind CSS v4", "CSS tokens", "next/font"],
  },
  {
    id: "motion",
    title: { it: "Movimento", en: "Motion" },
    body: {
      it: "Reveal legati allo scroll, molle fisiche su ogni superficie toccabile, scroll inerziale sincronizzato su un unico ticker.",
      en: "Scroll-bound reveals, physical springs on every touchable surface, inertial scrolling synced to a single ticker.",
    },
    tools: ["GSAP", "ScrollTrigger", "Framer Motion", "Lenis"],
  },
  {
    id: "webgl",
    title: { it: "WebGL e shader", en: "WebGL & shaders" },
    body: {
      it: "Shader GLSL scritti a mano: l'esplosione di glifi dell'hero e la rete di nodi ricavata dall'immagine JWST dei Pilastri della Creazione, il campo di particelle sullo sfondo, la faglia di luce del manifesto.",
      en: "Hand-written GLSL: the hero's glyph explosion and the node graph baked from JWST's Pillars of Creation image, the background particle field, the manifesto's rift of light.",
    },
    tools: ["React Three Fiber", "three.js", "GLSL"],
  },
  {
    id: "privacy",
    title: { it: "Bilingue e rispettoso", en: "Bilingual & respectful" },
    body: {
      it: "Italiano e inglese con routing per lingua. Nessun font o script di terze parti; analytics proprietarie su PostgreSQL, senza cookie finché non dai il consenso.",
      en: "Italian and English with per-locale routing. No third-party fonts or scripts; first-party analytics on PostgreSQL, cookieless until you consent.",
    },
    tools: ["next-intl", "PostgreSQL", "First-party"],
  },
  {
    id: "performance",
    title: { it: "Disciplina", en: "Discipline" },
    body: {
      it: "Il WebGL si ferma fuori schermo e a scheda nascosta, la densità dei pixel è limitata, e con «riduci movimento» ogni effetto ha una versione statica.",
      en: "WebGL pauses off-screen and on hidden tabs, pixel density is capped, and with reduced motion on every effect has a static fallback.",
    },
    tools: ["IntersectionObserver", "dpr ≤ 1.5", "prefers-reduced-motion"],
  },
];
