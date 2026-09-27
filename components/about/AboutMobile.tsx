"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils/cn";
import { aboutHeader, withEmphasis } from "./aboutCopy";
import { writingCopy } from "./writingCopy";
import {
  timelinePhases,
  timelineEvents,
  achievementBadges,
  aboutClosingStatement,
  aboutClosingEmphasis,
  writingCards,
  type TimelineLane,
  type TimelineEvent,
  type AchievementBadge,
  type WritingCard,
} from "@/content/about";

/* ============================================================================
   07 ABOUT / TRAIETTORIA — variante MOBILE (telefoni).

   Stessi contenuti della desktop, riga per riga (Google indicizza questa
   versione): header, legenda + nota, tutte le tappe, tutti i badge CON il loro
   dettaglio (in <details>, quindi nel DOM anche chiusi), gli scritti con la
   descrizione e la chiusura.

   Cosa cambia rispetto alla doppia elica desktop:
   · UN solo binario verticale a sinistra. Le due corsie restano distinte come
     sul desktop SOLO per geometria (quadrato = accademico, rombo =
     professionale) più un'etichetta testuale — mai per colore (spec §2).
   · Testo a 14–16px, niente box da 7–8px.
   · L'elica sopravvive come accenno: due filamenti SVG leggeri attorno al
     binario, disegnati una volta sola quando entrano in vista.
   · Nessun GSAP / ScrollTrigger / Tactile: un solo IntersectionObserver per il
     reveal (opacity + transform) e uno per il filamento.
   ========================================================================== */

type Locale = "it" | "en";

const ui = {
  it: {
    academic: "Percorso accademico",
    professional: "Percorso professionale",
    academicShort: "Accademico",
    professionalShort: "Professionale",
    note: "Un solo colore per entrambi: corrono insieme, non uno dopo l'altro.",
    ongoing: "in corso",
    swipe: "Scorri per vedere gli altri",
    article: "Articolo",
  },
  en: {
    academic: "Academic track",
    professional: "Professional track",
    academicShort: "Academic",
    professionalShort: "Professional",
    note: "One colour for both: they run together, not one after the other.",
    ongoing: "ongoing",
    swipe: "Swipe to see the others",
    article: "Article",
  },
} satisfies Record<Locale, Record<string, string>>;

/* ------------------------------------------------------------ glifi corsia -- */

function LaneMark({ lane, size = 10 }: { lane: TimelineLane; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="am-mark"
      data-lane={lane}
      style={{ width: size, height: size }}
    />
  );
}

/* ---------------------------------------------------------- filamento elica -- */

/** Due sinusoidi sfasate di π in un viewBox 28×1000: accenno di elica attorno al binario. */
function strandPath(phase: number): string {
  const cx = 14;
  const amp = 9;
  const period = 140;
  let d = "";
  for (let y = 0; y <= 1000; y += 10) {
    const x = cx + amp * Math.sin((y / period) * Math.PI * 2 + phase);
    d += `${y === 0 ? "M" : "L"}${x.toFixed(2)} ${y}`;
  }
  return d;
}
const STRAND_A = strandPath(0);
const STRAND_B = strandPath(Math.PI);

/* ------------------------------------------------------------------- tappe -- */

type Item =
  | { kind: "event"; lane: TimelineLane; order: number; data: TimelineEvent }
  | { kind: "badge"; lane: TimelineLane; order: number; data: AchievementBadge };

function itemsFor(phaseId: string): Item[] {
  const ev: Item[] = timelineEvents
    .filter((e) => e.phaseId === phaseId)
    .map((e) => ({ kind: "event", lane: e.lane, order: e.order ?? 0, data: e }));
  const bd: Item[] = achievementBadges
    .filter((b) => b.phaseId === phaseId)
    .map((b) => ({ kind: "badge", lane: b.lane, order: b.order ?? 0, data: b }));
  const laneRank = (l: TimelineLane) => (l === "academic" ? 0 : 1);
  const sort = (a: Item, b: Item) => a.order - b.order || laneRank(a.lane) - laneRank(b.lane);
  // Le tappe prima, i riconoscimenti dopo: la fase si legge dall'evento principale.
  return [...ev.sort(sort), ...bd.sort(sort)];
}

function EventRow({ e, locale }: { e: TimelineEvent; locale: Locale }) {
  const t = ui[locale];
  return (
    <li className="am-row" data-rv="">
      <span className="am-node" aria-hidden="true">
        <LaneMark lane={e.lane} size={e.lane === "academic" ? 10 : 9} />
      </span>
      <div className={cn("am-card", e.isOngoing && "am-card--ongoing")}>
        <p className="am-lane">
          {e.lane === "academic" ? t.academicShort : t.professionalShort}
          {e.yearHint ? <span className="am-year">{e.yearHint}</span> : null}
          {e.isOngoing ? (
            <span className="am-live">
              <span className="am-live-dot" aria-hidden="true" />
              {t.ongoing}
            </span>
          ) : null}
        </p>
        <h4 className="am-title">{e.title[locale]}</h4>
        {e.subtitle ? <p className="am-sub">{e.subtitle[locale]}</p> : null}
      </div>
    </li>
  );
}

function BadgeRow({ b, locale }: { b: AchievementBadge; locale: Locale }) {
  const t = ui[locale];
  return (
    <li className="am-row am-row--badge" data-rv="">
      <span className="am-node" aria-hidden="true">
        <span className="am-dot" />
      </span>
      <details className="am-badge">
        <summary>
          <LaneMark lane={b.lane} size={7} />
          <span className="am-badge-label">{b.label[locale]}</span>
          {b.year ? <span className="am-year">{b.year}</span> : null}
          <span className="am-chev" aria-hidden="true" />
          <span className="sr-only">
            {" "}
            · {b.lane === "academic" ? t.academicShort : t.professionalShort}
          </span>
        </summary>
        <p className="am-badge-detail">{b.detail[locale]}</p>
      </details>
    </li>
  );
}

/* ------------------------------------------------------------------ scritti -- */

function WritingCardMobile({ card, locale }: { card: WritingCard; locale: Locale }) {
  const t = writingCopy[locale];
  const live = card.published === true;
  const external = /^https?:\/\//i.test(card.href);
  const foreign = card.lang != null && card.lang !== locale;
  const note = card.languageNote?.[locale];

  return (
    <article className="am-book">
      <span className="am-book-spine" aria-hidden="true" />
      <p className="am-book-meta">
        <span>{ui[locale].article}</span>
        {card.lang ? <span className="am-lang">{card.lang.toUpperCase()}</span> : null}
      </p>
      <h4 className="am-book-title">{card.title[locale]}</h4>
      <p className="am-book-desc">{card.description[locale]}</p>
      {note ? <p className="am-book-note">{note}</p> : null}
      <div className="am-book-foot">
        {live ? (
          <a
            href={card.href}
            className="am-cta"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : null)}
            {...(card.lang ? { hrefLang: card.lang } : null)}
          >
            {t.discover}
            {foreign ? <span className="am-cta-tag">({card.lang!.toUpperCase()})</span> : null}
            <span aria-hidden="true">{external ? "↗" : "→"}</span>
            {external ? <span className="sr-only">{t.newTab}</span> : null}
          </a>
        ) : (
          <>
            <span className="am-cta am-cta--off" aria-disabled="true">
              {t.discover}
              <span className="am-cta-tag">{t.pending}</span>
            </span>
            <p className="am-book-note">{t.pendingDetail}</p>
          </>
        )}
      </div>
    </article>
  );
}

function WritingStripMobile({ locale }: { locale: Locale }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const n = writingCards.length;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || n < 2) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const first = track.firstElementChild as HTMLElement | null;
        const step = first ? first.offsetWidth + 12 : track.clientWidth;
        const i = Math.round(track.scrollLeft / Math.max(step, 1));
        setActive(Math.min(n - 1, Math.max(0, i)));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [n]);

  if (n === 0) return null;

  return (
    <div className="mt-14">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="eyebrow">{writingCopy[locale].heading}</h3>
        {n > 1 ? (
          <span className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.1em] tabular-nums text-[var(--text-low)]">
            <span className="text-[var(--aqua-300)]">{String(active + 1).padStart(2, "0")}</span> /{" "}
            {String(n).padStart(2, "0")}
          </span>
        ) : null}
      </div>
      <div
        ref={trackRef}
        className="am-strip -mx-5 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3"
        style={{ scrollPaddingInline: 20 }}
      >
        {writingCards.map((card) => (
          <div
            key={card.id}
            className={cn("shrink-0 snap-start", n > 1 ? "w-[84%]" : "w-full")}
          >
            <WritingCardMobile card={card} locale={locale} />
          </div>
        ))}
      </div>
      {n > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden="true">
          {writingCards.map((c, i) => (
            <span
              key={c.id}
              className="block h-[3px] rounded-full bg-[var(--aqua-400)] transition-[opacity,transform] duration-300"
              style={{
                width: 22,
                opacity: i === active ? 0.9 : 0.2,
                transform: `scaleX(${i === active ? 1 : 0.5})`,
              }}
            />
          ))}
        </div>
      ) : null}
      {n > 1 ? <p className="sr-only">{ui[locale].swipe}</p> : null}
    </div>
  );
}

/* --------------------------------------------------------------- sezione -- */

export function AboutMobile() {
  const locale = useLocale() as Locale;
  const copy = aboutHeader[locale];
  const t = ui[locale];
  const reduced = usePrefersReducedMotion();
  const tlRef = useRef<HTMLDivElement>(null);

  // Un solo IntersectionObserver: accende il filamento e rivela le righe una
  // volta sola. Solo opacity/transform, nessun layout durante lo scroll.
  useEffect(() => {
    const root = tlRef.current;
    if (!root) return;
    // Attributi scritti direttamente sul DOM: nessun re-render per il reveal.
    if (reduced || typeof IntersectionObserver === "undefined") {
      root.setAttribute("data-drawn", "");
      root.removeAttribute("data-armed");
      return;
    }
    root.setAttribute("data-armed", "");
    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-rv]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const el = en.target as HTMLElement;
          if (el === root) {
            root.setAttribute("data-drawn", "");
            io.unobserve(el);
            continue;
          }
          // Rivela anche tutte le righe PRECEDENTI: con uno scroll molto veloce
          // una riga può saltare il viewport senza mai risultare intersecante.
          const k = rows.indexOf(el);
          for (let j = 0; j <= k; j++) {
            if (!rows[j].hasAttribute("data-in")) {
              rows[j].setAttribute("data-in", "");
              io.unobserve(rows[j]);
            }
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );
    io.observe(root);
    rows.forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, [reduced]);

  return (
    <section id="about" className="section-padding relative overflow-x-clip">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "2%",
          right: "-30%",
          width: "110vw",
          height: "70vh",
          background: "var(--aurora-aqua)",
          opacity: 0.4,
        }}
      />

      <Container className="relative">
        <SectionHeader eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />

        {/* Legenda: livelli 2+3 della distinzione fra corsie (forma + testo). */}
        <div className="mt-10">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li className="am-legend">
              <LaneMark lane="academic" />
              {t.academic}
            </li>
            <li className="am-legend">
              <LaneMark lane="professional" size={9} />
              {t.professional}
            </li>
          </ul>
          <p className="mt-2.5 text-[14px] leading-[1.5] text-[var(--text-low)] [text-wrap:pretty]">
            {t.note}
          </p>
        </div>

        <div
          ref={tlRef}
          className="am-tl mt-9"
        >
          <svg
            className="am-strand"
            viewBox="0 0 28 1000"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <path d={STRAND_A} pathLength={1} />
            <path d={STRAND_B} pathLength={1} className="am-strand-b" />
          </svg>
          <span className="am-rail" aria-hidden="true" />

          <ol>
            {timelinePhases.map((ph, pi) => {
              const isToday = ph.id === "oggi";
              return (
                <li key={ph.id} className="am-phase">
                  <div className="am-phase-head" data-rv="">
                    <span className={cn("am-phase-node", isToday && "am-phase-node--today")} aria-hidden="true" />
                    <h3 className={cn("am-phase-label", isToday && "am-phase-label--today")}>
                      <span className="am-phase-idx">{String(pi + 1).padStart(2, "0")}</span>
                      {ph.label[locale]}
                    </h3>
                  </div>
                  <ol className="am-items">
                    {itemsFor(ph.id).map((it) =>
                      it.kind === "event" ? (
                        <EventRow key={it.data.id} e={it.data} locale={locale} />
                      ) : (
                        <BadgeRow key={it.data.id} b={it.data} locale={locale} />
                      ),
                    )}
                  </ol>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Chiusura — stesso testo e stessa enfasi serif-italic della desktop. */}
        <div className="mt-14">
          <span
            aria-hidden="true"
            className="block h-px w-full"
            style={{
              background:
                "linear-gradient(90deg, rgba(63,233,204,0) 0%, rgba(63,233,204,.32) 22%, rgba(63,233,204,.32) 78%, rgba(63,233,204,0) 100%)",
            }}
          />
          <p className="mt-8 text-[17px] leading-[1.6] text-[var(--text-mid)] [text-wrap:pretty]">
            {withEmphasis(aboutClosingStatement[locale], aboutClosingEmphasis[locale])}
          </p>
        </div>

        <WritingStripMobile locale={locale} />
      </Container>
    </section>
  );
}

export default AboutMobile;

/* ------------------------------------------------------------------- stile -- */

const RAIL_X = 13; // centro del binario, px dal bordo sinistro della timeline
const CSS = `
.am-mark{display:inline-block;flex:none;background:var(--aqua-400);box-shadow:0 0 10px -1px rgba(63,233,204,.55)}
.am-mark[data-lane="academic"]{border-radius:1.5px}
.am-mark[data-lane="professional"]{transform:rotate(45deg);border-radius:1px}
.am-legend{display:inline-flex;align-items:center;gap:10px;font-family:var(--font-mono);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-mid)}

.am-tl{position:relative;padding-left:40px}
.am-rail{position:absolute;left:${RAIL_X}px;top:6px;bottom:0;width:1px;
  background:linear-gradient(to bottom,rgba(63,233,204,.5),rgba(63,233,204,.22) 70%,rgba(63,233,204,0))}
.am-strand{position:absolute;left:${RAIL_X - 14}px;top:0;width:28px;height:100%;overflow:visible;pointer-events:none}
.am-strand path{fill:none;stroke:var(--aqua-400);stroke-width:1;vector-effect:non-scaling-stroke;
  stroke-opacity:.26;stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 2.2s cubic-bezier(.3,.6,.2,1)}
.am-strand .am-strand-b{stroke-opacity:.14;transition-delay:.25s}
.am-tl[data-drawn] .am-strand path{stroke-dashoffset:0}

.am-phase{position:relative}
.am-phase + .am-phase{margin-top:34px}
.am-phase-head{position:relative;display:flex;align-items:center;min-height:28px}
.am-phase-node{position:absolute;left:${RAIL_X - 40 - 7}px;top:50%;width:15px;height:15px;margin-top:-7.5px;border-radius:50%;
  background:var(--void);border:1px solid var(--aqua-400);box-shadow:0 0 14px -2px rgba(63,233,204,.6)}
.am-phase-node::after{content:"";position:absolute;inset:4px;border-radius:50%;background:var(--aqua-400)}
.am-phase-node--today{border-color:var(--ember);box-shadow:0 0 16px -2px rgba(255,122,77,.7)}
.am-phase-node--today::after{background:var(--ember)}
.am-phase-node--today::before{content:"";position:absolute;inset:-6px;border-radius:50%;border:1px solid var(--ember);opacity:.35}
.am-phase-label{display:flex;align-items:baseline;gap:10px;font-family:var(--font-display);font-size:20px;font-weight:500;
  letter-spacing:-.01em;color:var(--text-hi)}
.am-phase-label--today{color:var(--text-hi)}
.am-phase-idx{font-family:var(--font-mono);font-size:12px;letter-spacing:.14em;color:var(--aqua-300)}

.am-items{margin-top:14px;display:flex;flex-direction:column;gap:10px}
.am-row{position:relative}
.am-node{position:absolute;left:${RAIL_X - 40 - 10}px;top:20px;width:20px;height:20px;display:flex;align-items:center;justify-content:center}
.am-row--badge .am-node{top:14px}
.am-dot{width:5px;height:5px;border-radius:50%;background:var(--aqua-300);opacity:.7}

.am-card{position:relative;border-radius:14px;padding:14px 16px 15px;
  background:linear-gradient(160deg,rgba(17,30,37,.94),rgba(8,15,20,.9));
  box-shadow:inset 0 1px 0 rgba(223,255,248,.06),0 0 0 1px rgba(63,233,204,.1)}
.am-card--ongoing{box-shadow:inset 0 1px 0 rgba(223,255,248,.08),0 0 0 1px rgba(63,233,204,.26),0 0 28px -14px rgba(63,233,204,.6)}
.am-lane{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--text-low)}
.am-title{margin-top:6px;font-family:var(--font-display);font-size:17px;line-height:1.3;font-weight:500;color:var(--text-hi);text-wrap:balance}
.am-sub{margin-top:4px;font-size:14px;line-height:1.5;color:var(--text-mid);text-wrap:pretty}
.am-year{display:inline-flex;align-items:center;padding:1px 7px;border-radius:999px;border:1px solid var(--line);
  font-family:var(--font-mono);font-size:11px;letter-spacing:.06em;color:var(--aqua-300);white-space:nowrap}
.am-live{display:inline-flex;align-items:center;gap:6px;color:var(--aqua-300)}
.am-live-dot{width:6px;height:6px;border-radius:50%;background:var(--aqua-400);box-shadow:0 0 8px rgba(63,233,204,.8)}

.am-badge{border-radius:999px;border:1px solid var(--line);background:rgba(11,20,26,.7)}
.am-badge[open]{border-radius:14px;border-color:var(--line-hi)}
.am-badge summary{list-style:none;display:flex;align-items:center;gap:10px;min-height:44px;padding:8px 14px;cursor:pointer;
  -webkit-tap-highlight-color:transparent}
.am-badge summary::-webkit-details-marker{display:none}
.am-badge-label{flex:1;min-width:0;font-size:14px;line-height:1.35;color:var(--text-hi)}
.am-chev{flex:none;width:7px;height:7px;border-right:1.5px solid var(--text-low);border-bottom:1.5px solid var(--text-low);
  transform:rotate(45deg) translate(-2px,-2px);transition:transform .25s ease}
.am-badge[open] .am-chev{transform:rotate(225deg) translate(-1px,-1px)}
.am-badge-detail{padding:0 16px 14px 31px;font-size:14px;line-height:1.55;color:var(--text-mid);text-wrap:pretty}

.am-tl[data-armed] [data-rv]{opacity:0;transform:translate3d(0,14px,0);transition:opacity .55s ease,transform .6s cubic-bezier(.2,.8,.2,1)}
.am-tl[data-armed] [data-rv][data-in]{opacity:1;transform:none}

.am-strip{scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
.am-strip::-webkit-scrollbar{display:none}
.am-book{position:relative;height:100%;display:flex;flex-direction:column;border-radius:16px;padding:18px 18px 16px 26px;overflow:hidden;
  background:linear-gradient(160deg,rgba(21,38,46,.97),rgba(8,15,20,.95));
  box-shadow:inset 0 1px 0 rgba(223,255,248,.07),0 0 0 1px rgba(63,233,204,.12),0 20px 40px -24px rgba(0,0,0,.9)}
.am-book-spine{position:absolute;left:0;top:0;bottom:0;width:8px;
  background:linear-gradient(180deg,var(--aqua-500),var(--aqua-800));opacity:.75}
.am-book-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;font-family:var(--font-mono);font-size:11px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--text-low)}
.am-lang{padding:2px 7px;border-radius:6px;border:1px solid var(--line-hi);color:var(--aqua-300);letter-spacing:.1em}
.am-book-title{margin-top:12px;font-family:var(--font-display);font-size:19px;line-height:1.25;font-weight:500;color:var(--text-hi);text-wrap:balance}
.am-book-desc{margin-top:10px;font-size:14px;line-height:1.55;color:var(--text-mid);text-wrap:pretty}
.am-book-note{margin-top:8px;font-size:12.5px;line-height:1.45;color:var(--text-low)}
.am-book-foot{margin-top:auto;padding-top:16px}
.am-cta{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;
  border:1px solid var(--line-hi);background:rgba(63,233,204,.07);font-family:var(--font-mono);font-size:12px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--aqua-300);-webkit-tap-highlight-color:transparent;
  transition:background-color .2s ease,color .2s ease}
.am-cta:active{background:rgba(63,233,204,.16);color:var(--aqua-200)}
.am-cta-tag{letter-spacing:.06em;color:var(--text-mid)}
.am-cta--off{opacity:.55}
`;
