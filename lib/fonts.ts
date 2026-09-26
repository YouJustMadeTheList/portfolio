import localFont from "next/font/local";

/**
 * ART DIRECTION v2 §2 — quattro famiglie, ognuna con un compito preciso.
 *
 * I file sono SELF-HOSTED (lib/fonts/*.woff2, copiati dai pacchetti @fontsource)
 * invece di passare da next/font/google: l'ambiente di build non può raggiungere
 * fonts.googleapis.com, e un font che dipende da una fetch in fase di build è
 * comunque un punto di rottura in CI. Self-hosting = build deterministica,
 * nessuna richiesta a terze parti a runtime, un round-trip in meno al primo
 * paint. Sottoinsieme latin, `display: "swap"`.
 *
 * I componenti NON importano mai questi oggetti: consumano `var(--font-display)`,
 * `var(--font-serif)`, `var(--font-body)`, `var(--font-mono)` da app/globals.css.
 *
 * | Ruolo   | Famiglia         | Pesi        | Uso                                   |
 * |---------|------------------|-------------|---------------------------------------|
 * | Display | Space Grotesk    | 500, 700    | H1, H2, H3, numeri grandi             |
 * | Enfasi  | Instrument Serif | 400 italic  | frase-chiave dentro i titoli, in aqua |
 * | Corpo   | Inter            | 400, 500    | paragrafi, UI                         |
 * | Mono    | JetBrains Mono   | 400, 500    | eyebrow, label, dati, metriche        |
 */

export const spaceGrotesk = localFont({
  src: [
    { path: "./fonts/space-grotesk-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/space-grotesk-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-space-grotesk",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const instrumentSerif = localFont({
  src: [
    { path: "./fonts/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
  variable: "--font-instrument-serif",
  fallback: ["ui-serif", "Georgia", "serif"],
});

export const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-inter",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const jetbrainsMono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-jetbrains-mono",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});

/** Stringa unica da mettere su <body className={...}> — espone tutte e quattro le variabili. */
export const fontVariables = [
  spaceGrotesk.variable,
  instrumentSerif.variable,
  inter.variable,
  jetbrainsMono.variable,
].join(" ");
