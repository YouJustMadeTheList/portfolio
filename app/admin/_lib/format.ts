const nf = new Intl.NumberFormat("it-IT");
const compact = new Intl.NumberFormat("it-IT", { notation: "compact", maximumFractionDigits: 1 });

export function fmtNum(n: number): string {
  return Math.abs(n) >= 10_000 ? compact.format(n) : nf.format(Math.round(n));
}

export function fmtPct(ratio: number, digits = 0): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toLocaleString("it-IT", { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;
}

export function fmtDuration(ms: number): string {
  if (!ms || ms < 1000) return ms ? "<1s" : "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${String(r).padStart(2, "0")}s` : `${m}m`;
}

export function fmtDateTime(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function fmtDay(day: string, withYear = false): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(`${day}T00:00:00Z`));
}

const regionNames = new Intl.DisplayNames(["it"], { type: "region" });
export function countryName(code: string): string {
  if (!code) return "Sconosciuto";
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  "percorso-tappe": "Trust bar (tappe)",
  "section-1": "Trust bar",
  manifesto: "Manifesto",
  progetti: "Progetti",
  metodo: "Metodo",
  servizi: "Servizi & pricing",
  about: "About / traiettoria",
  rete: "Rete",
  contatti: "Contatti",
  stack: "Sotto il cofano (stack)",
  nav: "Navigazione",
  footer: "Footer",
  consent: "Banner consenso",
};

export const sectionLabel = (s: string | null) => (s ? (SECTION_LABELS[s] ?? s) : "—");

export const PROJECT_TYPES: Record<string, string> = {
  "data-ai": "Data & IA",
  fintech: "Fintech",
  edtech: "Edtech",
  custom: "Soluzione custom",
};

export const STATUS_LABELS: Record<string, string> = {
  new: "Nuova",
  replied: "Risposta inviata",
  archived: "Archiviata",
};

export const DEVICE_LABELS: Record<string, string> = { desktop: "Desktop", mobile: "Mobile", tablet: "Tablet" };
