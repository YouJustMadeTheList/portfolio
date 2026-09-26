"use client";

import type { ReactNode } from "react";
import { Tilt3D } from "@/components/fx/Tilt3D";
import { Tactile } from "@/components/ui/Tactile";
import {
  bookingUrl,
  contactCopy,
  contactEmail,
  instagramHandle,
  instagramUrl,
  isPlaceholderValue,
  linkedinUrl,
  phoneDisplay,
  phoneHref,
  whatsappUrl,
} from "@/content/contact";
import { cn } from "@/lib/utils/cn";

type DirectChannelsProps = {
  locale: "it" | "en";
};

// Blocco "Oppure, più diretto" — link statici (mailto/tel/https), sempre
// renderizzati server-side, sempre cliccabili anche a JS disabilitato: è di per
// sé il fallback primario del form, vedi specs/08-contatti.md §7. Card in vetro
// + tilt 3D come tutte le altre card del sito. Tutti i recapiti arrivano da
// content/contact.ts (unica fonte di verità).
export function DirectChannels({ locale }: DirectChannelsProps) {
  const copy = contactCopy[locale];

  return (
    <Tilt3D max={8} scale={1.008} className="h-full [border-radius:var(--radius-lg)]">
      <div className="glass-surface flex h-full flex-col gap-6 p-6 sm:p-7">
        <h3
          style={{ transform: "translateZ(24px)" }}
          className="font-[family-name:var(--font-display)] text-[length:var(--fs-h3)] font-medium leading-[var(--lh-h3)] text-[var(--text-hi)]"
        >
          {copy.channelsTitle}
        </h3>

        <div style={{ transform: "translateZ(18px)" }} className="flex flex-col gap-5">
          <ChannelRow
            value={contactEmail}
            href={`mailto:${contactEmail}`}
            label={copy.channelEmailLabel}
            sublabel={contactEmail}
            note={copy.placeholderNote}
            icon={
              <>
                <path d="M4 6h16v12H4z" />
                <path d="m4 7 8 6 8-6" />
              </>
            }
          />

          {/* Telefono + WhatsApp: due azioni sullo stesso numero. La riga resta
              un solo bersaglio (tel:), WhatsApp è una pillola sorella accanto,
              non annidata — mai un link dentro un link. */}
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <ChannelRow
              value={phoneHref}
              href={phoneHref}
              label={copy.channelPhoneLabel}
              sublabel={phoneDisplay}
              sublabelMono
              note={copy.placeholderNote}
              icon={
                <path d="M6.6 3.5h2.6l1.4 4-2 1.3a11 11 0 0 0 6.6 6.6l1.3-2 4 1.4v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />
              }
            />
            <ChannelPill href={whatsappUrl} label={copy.channelWhatsappLabel} />
          </div>

          <ChannelRow
            value={bookingUrl}
            href={bookingUrl}
            external
            label={copy.channelBookingLabel}
            sublabel={copy.channelBookingSubtext}
            note={copy.placeholderNote}
            icon={
              <>
                <rect x="4" y="5" width="16" height="15" rx="2" />
                <path d="M4 10h16M8 3v4M16 3v4" />
                <path d="M12 13v3l2 1" />
              </>
            }
          />
        </div>

        <div style={{ transform: "translateZ(16px)" }} className="flex flex-col gap-3 border-t border-[var(--line)] pt-5">
          <p className="font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[var(--ls-micro)] text-[var(--text-low)]">
            {copy.channelSocialLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            <ChannelPill href={linkedinUrl} label="LinkedIn" />
            <ChannelPill href={instagramUrl} label={`@${instagramHandle}`} />
          </div>
        </div>

        <p
          style={{ transform: "translateZ(14px)" }}
          className="border-l-2 border-[var(--accent-dim)] py-3 pl-3.5 text-[13px] leading-[1.5] text-[var(--text-mid)]"
        >
          {copy.trustRecall}
        </p>
      </div>
    </Tilt3D>
  );
}

/** Pillola in vetro per un canale secondario (WhatsApp, social). Cliccabile:
    risposta calma + magnetica, nessun wobble (§5.1). */
function ChannelPill({ href, label }: { href: string; label: string }) {
  if (isPlaceholderValue(href)) return null;
  return (
    <Tactile
      as="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      intensity="subtle"
      magnetic
      magneticMax={5}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--line)] bg-[rgba(11,20,26,0.5)] px-3 py-1.5",
        "font-[family-name:var(--font-body)] text-[12.5px] font-medium text-[var(--text-hi)] outline-none",
        "transition-[color,border-color,box-shadow] duration-[var(--dur-base)]",
        "hover:border-[var(--line-hi)] hover:text-[var(--aqua-300)] hover:shadow-[var(--glow-xs)]",
        "focus-visible:[outline:2px_solid_var(--focus-ring)] focus-visible:outline-offset-2",
      )}
    >
      {label}
      <span aria-hidden="true" className="text-[11px] text-[var(--aqua-400)]">
        ↗
      </span>
    </Tactile>
  );
}

/**
 * Riga canale — degrada in nota inerte (niente `href`) quando il valore è
 * ancora un placeholder `TODO_*` (es. la pagina di prenotazione Google Calendar) (brief: "make
 * sure they degrade gracefully"). Resta comunque tattile (wobble) come ogni
 * elemento statico non banale del sito.
 */
function ChannelRow({
  value,
  href,
  label,
  sublabel,
  note,
  icon,
  external = false,
  sublabelMono = false,
}: {
  value: string;
  href: string;
  label: string;
  sublabel?: string;
  sublabelMono?: boolean;
  note: string;
  icon: ReactNode;
  external?: boolean;
}) {
  const placeholder = isPlaceholderValue(value);

  return (
    <Tactile
      as={placeholder ? "div" : "a"}
      href={placeholder ? undefined : href}
      target={!placeholder && external ? "_blank" : undefined}
      rel={!placeholder && external ? "noopener noreferrer" : undefined}
      intensity="subtle"
      magnetic={!placeholder}
      magneticMax={6}
      aria-disabled={placeholder ? "true" : undefined}
      title={placeholder ? note : undefined}
      className={cn(
        "group flex items-start gap-3 rounded-[var(--radius-sm)] outline-none",
        placeholder && "cursor-default",
      )}
    >
      <ChannelIcon>{icon}</ChannelIcon>
      <span className="flex flex-col">
        <span
          className={cn(
            "font-[family-name:var(--font-display)] text-[15px] font-semibold",
            /* Non barrato: un line-through su un link si legge come un bug di
               rendering. Un canale "non ancora attivo" si comunica smorzandolo
               e sottolineandolo tratteggiato — la riga "Presto disponibile"
               sotto dice già il resto. */
            placeholder
              ? "self-start border-b border-dashed border-[var(--line)] pb-px text-[var(--text-low)]"
              : "text-[var(--text-hi)] group-hover:text-[var(--aqua-300)]",
          )}
        >
          {label}
        </span>
        {placeholder || sublabel ? (
          <span
            className={cn(
              "text-[13px] text-[var(--text-mid)]",
              sublabelMono && !placeholder
                ? "font-[family-name:var(--font-mono)] tracking-[0.02em] [font-variant-numeric:tabular-nums]"
                : "font-[family-name:var(--font-body)]",
            )}
          >
            {placeholder ? note : sublabel}
          </span>
        ) : null}
      </span>
    </Tactile>
  );
}

function ChannelIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--aqua-400)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 [filter:drop-shadow(var(--glow-xs))]"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export default DirectChannels;
