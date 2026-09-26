"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";
import { restStyle, slotAt } from "./deckStack";
import type { PhaseCopy } from "@/content/method";

export type PhaseCardRole = "active" | "stack-1" | "stack-2" | "stack-3";

export type PhaseCardProps = {
  /** Indice della fase (0..3) — deriva "01".."04". */
  index: number;
  total: number;
  phase: PhaseCopy;
  /** Parola per "Fase"/"Phase". */
  phaseWord: string;
  /**
   * Profondità AL MOUNT, non quella corrente: serve solo a produrre lo stile
   * inline server-side (spessore visibile nel primo frame). Da quel momento in
   * poi la trasformazione è di GSAP, e questa prop non cambia mai — così React
   * non sovrascrive mai la matrice animata con un re-render.
   */
  initialDepth: number;
  /** true → renderizza la faccia leggibile. Le carte di spessore non hanno testo (§5.2 nota). */
  showContent: boolean;
  /** true solo per la carta in cima: guida aria e ombra sollevata. */
  isActive: boolean;
  /** Ref allo scrim di profondità, animato da PhaseDeck. */
  scrimRef?: (el: HTMLSpanElement | null) => void;
  onPointerEnterCard?: () => void;
  onPointerLeaveCard?: () => void;
  onActivate?: () => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Losanga aqua — il "seme" della carta. Ripetuta specchiata in basso a destra. */
function Pip({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block h-[7px] w-[7px] rotate-45 rounded-[1px]", className)}
      style={{
        background: "linear-gradient(140deg, var(--aqua-300), var(--aqua-600))",
        boxShadow: "var(--glow-xs)",
      }}
    />
  );
}

/** Indice d'angolo alla "carta da gioco": numero + seme, in mono. */
function CornerIndex({ label, mirrored }: { label: string; mirrored?: boolean }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[13px] font-medium tracking-[0.12em] tabular-nums text-[var(--aqua-300)]",
        mirrored && "rotate-180",
      )}
    >
      {label}
      <Pip />
    </span>
  );
}

/**
 * Una carta del mazzo.
 *
 * Non calcola mai la propria posizione corrente: offset/rotazione/scrim sono
 * applicati imperativamente da PhaseDeck via GSAP (spec §7, nota implementativa).
 * L'unica geometria che conosce è quella di RIPOSO al mount, usata per lo stile
 * inline SSR che rende il mazzo spesso già nel primo frame dipinto.
 *
 * La faccia è una composizione, non un paragrafo sospeso (ART-DIRECTION §6):
 * indice d'angolo + seme in alto, blocco editoriale centrato nello spazio
 * residuo, cifra enorme in filigrana nella superficie stessa della carta,
 * chip delle parole-chiave, righello di avanzamento sulle quattro fasi e indice
 * specchiato in basso a destra. Nessuna zona morta.
 */
export const PhaseCard = forwardRef<HTMLDivElement, PhaseCardProps>(function PhaseCard(
  {
    index,
    total,
    phase,
    phaseWord,
    initialDepth,
    showContent,
    isActive,
    scrimRef,
    onPointerEnterCard,
    onPointerLeaveCard,
    onActivate,
  },
  ref,
) {
  const label = pad(index + 1);

  return (
    <div
      ref={ref}
      data-phase={label}
      aria-hidden={!isActive}
      onPointerEnter={onPointerEnterCard}
      onPointerLeave={onPointerLeaveCard}
      onClick={onActivate}
      className={cn(
        "absolute left-1/2 top-1/2 w-full overflow-hidden rounded-[20px]",
        "h-[392px] sm:h-[404px] lg:h-[424px] min-[1440px]:h-[444px]",
      )}
      style={{
        ...restStyle(initialDepth),
        // `overflow: hidden` (serve a tagliare la filigrana sul bordo carta)
        // appiattisce comunque il 3D dei figli: la profondità la fa il palco,
        // non un translateZ interno.
        willChange: "transform",
        // Superficie di carta: opaca, così la pila legge come materia solida e
        // non come quattro vetri sovrapposti (niente backdrop-filter: quattro
        // blur impilati costerebbero i 60fps richiesti da ART-DIRECTION §7).
        background:
          "linear-gradient(158deg, rgba(21,38,46,0.985) 0%, rgba(11,20,26,0.99) 46%, rgba(6,12,16,0.995) 100%)",
        boxShadow: isActive
          ? "inset 0 1px 0 rgba(223,255,248,0.09), 0 30px 70px -28px rgba(0,0,0,0.95), 0 0 0 1px rgba(63,233,204,0.10), 0 0 64px -30px rgba(63,233,204,0.45)"
          : "inset 0 1px 0 rgba(223,255,248,0.06), 0 18px 44px -20px rgba(0,0,0,0.95), 0 0 0 1px rgba(63,233,204,0.07)",
      }}
    >
      {/* Bordo a gradiente (L4) — aqua in alto a sinistra, spento in basso a destra. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[20px]"
        style={{
          padding: "1px",
          background: isActive ? "var(--border-gradient-hi)" : "var(--border-gradient)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      {/* SPESSORE FISICO — filo di luce sul bordo alto: è il taglio della carta. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, rgba(63,233,204,0) 0%, rgba(223,255,248,0.55) 22%, rgba(63,233,204,0.85) 50%, rgba(223,255,248,0.5) 78%, rgba(63,233,204,0) 100%)",
        }}
      />
      {/* La lamella scoperta delle carte sotto: sfumatura che la stacca dal buio. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[72px]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(63,233,204,0.11), rgba(63,233,204,0.02) 46%, rgba(63,233,204,0) 100%)",
        }}
      />

      {showContent ? (
        <div className="relative flex h-full flex-col p-6 sm:p-7 lg:p-8">
          {/* Filigrana: la cifra della fase incisa nella superficie della carta. */}
          <span
            aria-hidden="true"
            data-part="watermark"
            className="pointer-events-none absolute -right-2 bottom-[-0.24em] select-none font-[family-name:var(--font-display)] text-[150px] font-bold leading-[0.72] tracking-[-0.06em] sm:text-[176px] lg:text-[208px]"
            style={{
              backgroundImage:
                "linear-gradient(175deg, rgba(63,233,204,0.17) 0%, rgba(63,233,204,0.05) 52%, rgba(63,233,204,0) 88%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {label}
          </span>

          {/* Riga d'angolo — indice + seme, come su una carta da gioco. */}
          <div data-part="head" className="relative flex items-start justify-between">
            <CornerIndex label={label} />
            <span className="font-[family-name:var(--font-mono)] text-[length:var(--fs-micro)] uppercase tracking-[var(--ls-micro)] text-[var(--text-low)]">
              {phaseWord} {label}/{pad(total)}
            </span>
          </div>

          {/* Blocco editoriale: centrato nello spazio residuo, mai appoggiato in alto. */}
          <div className="relative flex flex-1 flex-col justify-center gap-4 py-6">
            <h3
              data-part="title"
              className="font-[family-name:var(--font-display)] text-[length:var(--fs-h3)] font-medium leading-[var(--lh-h3)] tracking-[var(--ls-h3)] text-[var(--text-hi)]"
            >
              {phase.title}
            </h3>

            <span
              data-part="rule"
              aria-hidden="true"
              className="block h-px w-full max-w-[220px]"
              style={{
                background:
                  "linear-gradient(90deg, rgba(63,233,204,0.75), rgba(63,233,204,0.12) 58%, rgba(63,233,204,0) 100%)",
              }}
            />

            <p
              data-part="body"
              className="max-w-[38ch] text-[length:var(--fs-body)] leading-[var(--lh-body)] text-[var(--text-mid)] [text-wrap:pretty]"
            >
              {phase.description}
            </p>

            <ul data-part="focus" className="mt-1 flex flex-wrap gap-2">
              {phase.focus.map((f) => (
                <li
                  key={f}
                  className="rounded-full border border-[var(--line)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-[var(--text-low)] transition-[color,border-color,box-shadow] duration-200 hover:border-[var(--line-hi)] hover:text-[var(--aqua-300)] hover:shadow-[var(--glow-xs)]"
                >
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Righello di avanzamento sulle quattro fasi + indice specchiato. */}
          <div data-part="foot" className="relative flex items-end justify-between gap-4">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => {
                const done = i < index;
                const now = i === index;
                return (
                  <span
                    key={i}
                    className="block h-[3px] rounded-full transition-all duration-300"
                    style={{
                      width: now ? 34 : 14,
                      background: now
                        ? "linear-gradient(90deg, var(--aqua-300), var(--aqua-500))"
                        : done
                          ? "rgb(var(--aqua-rgb) / 0.42)"
                          : "rgb(var(--aqua-rgb) / 0.13)",
                      boxShadow: now ? "var(--glow-xs)" : "none",
                    }}
                  />
                );
              })}
            </div>
            <CornerIndex label={label} mirrored />
          </div>
        </div>
      ) : null}

      {/* Scrim di profondità — ultimo figlio, affonda la carta nel vuoto. */}
      <span
        ref={scrimRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[20px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(3,7,10,0.55) 0%, rgba(3,7,10,1) 42%)",
          // opacità di riposo già server-side: nel primo frame le carte sotto
          // sono già affondate nel vuoto, non nere piatte né tutte uguali.
          opacity: slotAt(initialDepth).scrim,
        }}
      />
    </div>
  );
});

export default PhaseCard;
