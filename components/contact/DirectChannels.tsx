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

/**
 * Variante MOBILE di "Oppure, più diretto": stesso contenuto, forma da
 * telefono. Un elenco di righe grandi (≥ 56px, a tutta larghezza) invece della
 * card con tilt 3D: nessun Tactile, nessun translateZ, nessun blur — solo
 * feedback al tocco. Le righe placeholder restano note inerti.
 */
export function MobileChannels({ locale }: DirectChannelsProps) {
  const copy = contactCopy[locale];

  const rows: {
    key: string;
    value: string;
    href: string;
    label: string;
    sublabel: string;
    mono?: boolean;
    external?: boolean;
    icon: ReactNode;
  }[] = [
    {
      key: "email",
      value: contactEmail,
      href: `mailto:${contactEmail}`,
      label: copy.channelEmailLabel,
      sublabel: contactEmail,
      icon: (
        <>
          <path d="M4 6h16v12H4z" />
          <path d="m4 7 8 6 8-6" />
        </>
      ),
    },
    {
      key: "phone",
      value: phoneHref,
      href: phoneHref,
      label: copy.channelPhoneLabel,
      sublabel: phoneDisplay,
      mono: true,
      icon: (
        <path d="M6.6 3.5h2.6l1.4 4-2 1.3a11 11 0 0 0 6.6 6.6l1.3-2 4 1.4v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />
      ),
    },
    {
      key: "whatsapp",
      value: whatsappUrl,
      href: whatsappUrl,
      label: copy.channelWhatsappLabel,
      sublabel: phoneDisplay,
      mono: true,
      external: true,
      icon: (
        <>
          <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8Z" />
          <path d="M9.2 9.1c.2 1.9 1.8 3.6 3.7 3.8l1-1 1.6.7-.2 1.2a1.2 1.2 0 0 1-1.3.9 6.4 6.4 0 0 1-5.8-5.8 1.2 1.2 0 0 1 .9-1.3l1.2-.2.7 1.6Z" />
        </>
      ),
    },
    {
      key: "booking",
      value: bookingUrl,
      href: bookingUrl,
      label: copy.channelBookingLabel,
      sublabel: copy.channelBookingSubtext,
      external: true,
      icon: (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M4 10h16M8 3v4M16 3v4" />
          <path d="M12 13v3l2 1" />
        </>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-[family-name:var(--font-display)] text-[1.25rem] font-medium leading-[1.2] text-[var(--text-hi)]">
        {copy.channelsTitle}
      </h3>

      <ul className="flex list-none flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[rgba(11,20,26,0.72)]">
        {rows.map((row) => {
          const placeholder = isPlaceholderValue(row.value);
          const inner = (
            <>
              <ChannelIcon>{row.icon}</ChannelIcon>
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={cn(
                    "font-[family-name:var(--font-display)] text-[15.5px] font-semibold",
                    placeholder ? "text-[var(--text-low)]" : "text-[var(--text-hi)]",
                  )}
                >
                  {row.label}
                </span>
                <span
                  className={cn(
                    "text-[13px] leading-[1.45] text-[var(--text-mid)] [overflow-wrap:anywhere]",
                    row.mono && !placeholder
                      ? "font-[family-name:var(--font-mono)] [font-variant-numeric:tabular-nums]"
                      : "font-[family-name:var(--font-body)]",
                  )}
                >
                  {placeholder ? `${copy.placeholderNote} · ${row.sublabel}` : row.sublabel}
                </span>
              </span>
              {placeholder ? null : (
                <span aria-hidden="true" className="shrink-0 text-[14px] text-[var(--aqua-400)]">
                  {row.external ? "↗" : "→"}
                </span>
              )}
            </>
          );
          const rowClass =
            "flex min-h-[60px] items-center gap-3.5 px-4 py-3 [-webkit-tap-highlight-color:transparent]";
          return (
            <li key={row.key} className="border-b border-[var(--line)] last:border-b-0">
              {placeholder ? (
                <div aria-disabled="true" className={cn(rowClass, "cursor-default")}>
                  {inner}
                </div>
              ) : (
                <a
                  href={row.href}
                  target={row.external ? "_blank" : undefined}
                  rel={row.external ? "noopener noreferrer" : undefined}
                  className={cn(
                    rowClass,
                    "outline-none transition-colors duration-150 active:bg-[rgb(var(--aqua-rgb)/0.08)]",
                    "focus-visible:[outline:2px_solid_var(--focus-ring)] focus-visible:-outline-offset-2",
                  )}
                >
                  {inner}
                </a>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-1 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[var(--ls-micro)] text-[var(--text-low)]">
          {copy.channelSocialLabel}
        </p>
        {[
          { href: linkedinUrl, label: "LinkedIn" },
          { href: instagramUrl, label: `@${instagramHandle}` },
        ]
          .filter((l) => !isPlaceholderValue(l.href))
          .map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--line)] bg-[rgba(11,20,26,0.6)] px-3.5 text-[13.5px] font-medium text-[var(--text-hi)] outline-none active:border-[var(--line-hi)] focus-visible:[outline:2px_solid_var(--focus-ring)] focus-visible:outline-offset-2"
            >
              {l.label}
              <span aria-hidden="true" className="text-[11px] text-[var(--aqua-400)]">
                ↗
              </span>
            </a>
          ))}
      </div>

      <p className="border-l-2 border-[var(--accent-dim)] py-1 pl-3.5 text-[13px] leading-[1.5] text-[var(--text-mid)]">
        {copy.trustRecall}
      </p>
    </div>
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
