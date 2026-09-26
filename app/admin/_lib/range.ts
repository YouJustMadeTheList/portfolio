import { TZ } from "@/lib/analytics/queries";

/** Offset (ms) di Europe/Rome in un certo istante. */
function tzOffsetMs(at: Date): number {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = part?.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0)) * 60_000;
}

/** Mezzanotte a Roma del giorno YYYY-MM-DD, come istante UTC. */
export function romeMidnight(day: string): Date {
  const [y, mo, d] = day.split("-").map(Number) as [number, number, number];
  const guess = Date.UTC(y, mo - 1, d);
  return new Date(guess - tzOffsetMs(new Date(guess)));
}

export function romeToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function addDays(day: string, n: number): string {
  const [y, mo, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, mo - 1, d + n)).toISOString().slice(0, 10);
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ResolvedRange = {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  days: number;
  preset: "7" | "30" | "90" | "custom";
  fromDay: string;
  toDay: string; // inclusivo
};

export function resolveRange(sp: Record<string, string | string[] | undefined>): ResolvedRange {
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const today = romeToday();
  let fromDay: string;
  let toDay: string;
  let preset: ResolvedRange["preset"];

  const f = get("from");
  const t = get("to");
  if (f && t && DAY_RE.test(f) && DAY_RE.test(t) && f <= t && !Number.isNaN(Date.parse(f)) && !Number.isNaN(Date.parse(t))) {
    fromDay = f;
    toDay = t > today ? today : t;
    preset = "custom";
    // massimo 400 giorni
    if ((Date.parse(toDay) - Date.parse(fromDay)) / 86_400_000 > 400) fromDay = addDays(toDay, -400);
  } else {
    const r = get("range");
    preset = r === "7" || r === "90" ? r : "30";
    toDay = today;
    fromDay = addDays(today, -(Number(preset) - 1));
  }

  const from = romeMidnight(fromDay);
  const to = romeMidnight(addDays(toDay, 1));
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  const prevTo = from;
  const prevFrom = romeMidnight(addDays(fromDay, -days));
  return { from, to, prevFrom, prevTo, days, preset, fromDay, toDay };
}
