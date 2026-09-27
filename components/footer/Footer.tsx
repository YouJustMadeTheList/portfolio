"use client";

import type { ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { BlockReveal } from "@/components/fx/TextReveal";
import { navSections } from "@/content/nav";
import { NavLink } from "@/components/nav/NavLink";
import { BackToTopButton } from "./BackToTopButton";
import { FooterDirectory } from "./FooterDirectory";
import { Link } from "@/lib/i18n/navigation";
import {
  contactEmail,
  footerCopy,
  instagramHandle,
  instagramUrl,
  isPlaceholderValue,
  linkedinUrl,
  phoneDisplay,
  phoneHref,
  whatsappUrl,
} from "@/content/footer";
import { Tactile } from "@/components/ui/Tactile";
import { cn } from "@/lib/utils/cn";
import { useIsMobileVariant } from "@/components/variant/VariantProvider";
import { useHomeAnchor } from "@/components/nav/useHomeAnchor";

/**
 * Footer v2 — "una vera chiusura, non una striscia sottile" (brief).
 *
 * Wordmark grande, colonne editoriali, social link magnetici, back-to-top,
 * link legali. I recapiti arrivano da content/contact.ts; se uno tornasse a
 * essere un placeholder `TODO_*`, `PlaceholderAware` lo rende inerte — il
 * sito non spedisce mai un `mailto:` o un `href` rotto.
 *
 * Reveal minimale per definizione (spec 00 §C.4): un solo fade+translateY
 * sul blocco intero, nessuno stagger sui singoli elementi — il footer non
 * deve competere con nulla, è l'ultima cosa che si vede.
 */
export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const locale = useLocale() as "it" | "en";
  const copy = footerCopy[locale];
  const mobile = useIsMobileVariant();

  if (mobile) return <MobileFooter />;

  return (
    // `overflow-clip` e non `overflow-x-clip`: l'aurora sfora di ~180px sotto il
    // bordo inferiore del footer, e ritagliando solo in orizzontale allungava il
    // documento oltre l'ultimo elemento visibile — a schermo si vedeva una
    // striscia di vuoto con una giuntura netta dopo il footer.
    <footer className="relative overflow-clip border-t border-[var(--line)] bg-[var(--base)]">
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "-30%",
          left: "8%",
          width: "min(760px, 90vw)",
          height: "min(520px, 60vh)",
          background: "var(--aurora-abyss)",
          opacity: 0.3,
        }}
      />
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          bottom: "-20%",
          right: "-10%",
          width: "min(600px, 80vw)",
          height: "min(460px, 50vh)",
          background: "var(--aurora-aqua)",
          opacity: 0.22,
        }}
      />

      <BlockReveal className="relative">
        <Container className="section-padding">
          {/* Wordmark grande — la firma prima della chiusura. */}
          <Tactile
            as="p"
            intensity="subtle"
            className="select-none font-[family-name:var(--font-display)] font-medium leading-[0.92] tracking-[-0.02em] text-[var(--text-hi)]"
            style={{ fontSize: "clamp(2.4rem, 1.6rem + 5vw, 6.5rem)" }}
          >
            Davide De Sanctis
          </Tactile>

          <div className="mt-14 grid grid-cols-1 gap-12 sm:grid-cols-3 lg:mt-16">
            <div>
              <p className="eyebrow" style={{ color: "var(--text-low-aa)" }}>{copy.eyebrow}</p>
              <p className="mt-4 max-w-xs text-[length:var(--fs-lead)] leading-[var(--lh-lead)] text-[var(--text-hi)] [text-wrap:pretty]">
                {copy.ctaText}
              </p>
              <p className="mt-3 max-w-xs text-[length:var(--fs-body)] text-[var(--text-mid)]">
                {t("tagline")}
              </p>
              <div className="mt-5">
                <PlaceholderAware
                  value={contactEmail}
                  href={`mailto:${contactEmail}`}
                  note={copy.placeholderNote}
                  label={copy.emailLabel}
                >
                  {contactEmail}
                </PlaceholderAware>
              </div>
            </div>

            <div>
              <p className="font-[family-name:var(--font-mono)] text-[length:var(--fs-micro)] font-medium uppercase tracking-[var(--ls-micro)] text-[var(--text-low-aa)]">
                {t("colSections")}
              </p>
              <ul className="mt-5 flex flex-col gap-3.5">
                {navSections.map((s) => (
                  <li key={s.id}>
                    <NavLink id={s.id} label={tNav(s.messageKey)} />
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-[family-name:var(--font-mono)] text-[length:var(--fs-micro)] font-medium uppercase tracking-[var(--ls-micro)] text-[var(--text-low-aa)]">
                {t("colConnect")}
              </p>
              <ul className="mt-5 flex flex-col gap-3.5 text-[length:var(--fs-body)]">
                <li>
                  <PlaceholderAware value={linkedinUrl} href={linkedinUrl} note={copy.placeholderNote} external>
                    LinkedIn
                  </PlaceholderAware>
                </li>
                <li>
                  <PlaceholderAware value={instagramUrl} href={instagramUrl} note={copy.placeholderNote} external>
                    Instagram
                    <span className="ml-2 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.02em] text-[var(--text-low-aa)]">
                      @{instagramHandle}
                    </span>
                  </PlaceholderAware>
                </li>
                <li>
                  <PlaceholderAware value={phoneHref} href={phoneHref} note={copy.placeholderNote}>
                    <span className="[font-variant-numeric:tabular-nums]">{phoneDisplay}</span>
                  </PlaceholderAware>
                </li>
                <li>
                  <PlaceholderAware value={whatsappUrl} href={whatsappUrl} note={copy.placeholderNote} external>
                    WhatsApp
                  </PlaceholderAware>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14 border-t border-[var(--line)] pt-10">
            <FooterDirectory locale={locale} />
          </div>

          <div className="mt-16 flex flex-col-reverse items-center justify-between gap-6 border-t border-[var(--line)] pt-8 sm:flex-row lg:mt-20">
            <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
              <p className="text-[length:var(--fs-micro)] text-[var(--text-low-aa)]">
                © {new Date().getFullYear()} Davide De Sanctis. {t("rights")}
              </p>
              <nav aria-label={t("colLegal")}>
                <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 sm:-ml-1.5 sm:justify-start">
                  <li>
                    <LegalLink href="/privacy">{copy.legal.privacy}</LegalLink>
                  </li>
                  <LegalDot />
                  <li>
                    <LegalLink href="/cookie">{copy.legal.cookie}</LegalLink>
                  </li>
                  <LegalDot />
                  <li>
                    <Tactile
                      as="button"
                      type="button"
                      intensity="subtle"
                      onClick={() => window.dispatchEvent(new Event("consent:open"))}
                      className={legalItemClass}
                    >
                      {copy.legal.cookiePreferences}
                    </Tactile>
                  </li>
                </ul>
              </nav>
            </div>
            <BackToTopButton />
          </div>
        </Container>
      </BlockReveal>
    </footer>
  );
}

/**
 * Footer della variante MOBILE. Stessi contenuti della desktop, forma da
 * telefono:
 *  - il wordmark va su DUE righe ("Davide" / "De Sanctis") con corpo legato
 *    alla larghezza del viewport: non viene mai tagliato;
 *  - Sezioni e Contatti affiancati in due colonne compatte, voci alte ≥ 40px;
 *  - legali + "Preferenze cookie" sempre presenti;
 *  - spazio in fondo per la ContactActionBar (safe-area inclusa), così non
 *    copre mai i link legali.
 * Niente reveal, niente Tactile/magnetismo, niente blur.
 */
function MobileFooter() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const locale = useLocale() as "it" | "en";
  const copy = footerCopy[locale];
  const { hrefFor, scrollIfHome } = useHomeAnchor();

  const linkClass =
    "inline-flex min-h-10 items-center text-[15px] text-[var(--text-mid)] outline-none active:text-[var(--aqua-300)] focus-visible:[outline:2px_solid_var(--focus-ring)] focus-visible:outline-offset-2 rounded-[var(--radius-xs)]";
  const colLabel =
    "font-[family-name:var(--font-mono)] text-[length:var(--fs-micro)] font-medium uppercase tracking-[var(--ls-micro)] text-[var(--text-low-aa)]";
  const connect = [
    { value: linkedinUrl, href: linkedinUrl, label: "LinkedIn", external: true },
    { value: instagramUrl, href: instagramUrl, label: "Instagram", external: true },
    { value: phoneHref, href: phoneHref, label: phoneDisplay, external: false },
    { value: whatsappUrl, href: whatsappUrl, label: "WhatsApp", external: true },
  ];

  return (
    <footer
      className="relative overflow-clip border-t border-[var(--line)] bg-[var(--base)]"
      style={{ paddingBottom: "calc(84px + env(safe-area-inset-bottom, 0px))" }}
    >
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "-20%",
          left: "-20%",
          width: "110vw",
          height: "50vh",
          background: "var(--aurora-abyss)",
          opacity: 0.26,
        }}
      />
      <div className="relative px-5 pt-14">
        <p
          className="select-none font-[family-name:var(--font-display)] font-medium leading-[0.95] tracking-[-0.025em] text-[var(--text-hi)]"
          style={{ fontSize: "min(15vw, 4.5rem)" }}
        >
          <span className="block">Davide</span> <span className="block whitespace-nowrap">De Sanctis</span>
        </p>

        <div className="mt-8">
          <p className="eyebrow" style={{ color: "var(--text-low-aa)" }}>{copy.eyebrow}</p>
          <p className="mt-3 text-[17px] leading-[1.45] text-[var(--text-hi)] [text-wrap:pretty]">{copy.ctaText}</p>
          <p className="mt-1.5 text-[14.5px] text-[var(--text-mid)]">{t("tagline")}</p>
          {isPlaceholderValue(contactEmail) ? (
            <p className="mt-2 text-[15px] text-[var(--text-low-aa)]">
              {copy.emailLabel} · {copy.placeholderNote}
            </p>
          ) : (
            <a href={`mailto:${contactEmail}`} className={cn(linkClass, "mt-1 text-[var(--aqua-300)] [overflow-wrap:anywhere]")}>
              {contactEmail}
            </a>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-x-6">
          <div>
            <p className={colLabel}>{t("colSections")}</p>
            <ul className="mt-2 flex list-none flex-col">
              {navSections.map((s) => (
                <li key={s.id}>
                  <a href={hrefFor(s.id)} onClick={(e) => scrollIfHome(e, `#${s.id}`)} className={linkClass}>
                    {tNav(s.messageKey)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={colLabel}>{t("colConnect")}</p>
            <ul className="mt-2 flex list-none flex-col">
              {connect.map((c) => (
                <li key={c.label}>
                  {isPlaceholderValue(c.value) ? (
                    <span className={cn(linkClass, "text-[var(--text-low-aa)]")}>{copy.placeholderNote}</span>
                  ) : (
                    <a
                      href={c.href}
                      target={c.external ? "_blank" : undefined}
                      rel={c.external ? "noopener noreferrer" : undefined}
                      className={cn(
                        linkClass,
                        c.href === phoneHref && "whitespace-nowrap [font-variant-numeric:tabular-nums]",
                        c.href === instagramUrl && "flex-col items-start justify-center py-1 leading-tight",
                      )}
                    >
                      {c.label}
                      {c.href === instagramUrl ? (
                        <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.02em] text-[var(--text-low-aa)]">
                          @{instagramHandle}
                        </span>
                      ) : null}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--line)] pt-6">
          <FooterDirectory locale={locale} compact />
        </div>

        <div className="mt-10 flex items-end justify-between gap-4 border-t border-[var(--line)] pt-6">
          <div className="flex min-w-0 flex-col gap-2">
            <nav aria-label={t("colLegal")}>
              <ul className="-ml-1.5 flex list-none flex-wrap items-center gap-x-2">
                <li>
                  <Link href="/privacy" className={cn(legalItemClass, "min-h-10")}>
                    {copy.legal.privacy}
                  </Link>
                </li>
                <li>
                  <Link href="/cookie" className={cn(legalItemClass, "min-h-10")}>
                    {copy.legal.cookie}
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event("consent:open"))}
                    className={cn(legalItemClass, "min-h-10")}
                  >
                    {copy.legal.cookiePreferences}
                  </button>
                </li>
              </ul>
            </nav>
            <p className="text-[length:var(--fs-micro)] text-[var(--text-low-aa)]">
              © {new Date().getFullYear()} Davide De Sanctis. {t("rights")}
            </p>
          </div>
          <BackToTopButton />
        </div>
      </div>
    </footer>
  );
}

/* Voci legali: mono micro, come le label di colonna — presenti, mai rumorose. */
const legalItemClass = cn(
  "inline-flex items-center rounded-[var(--radius-xs)] px-1.5 py-1 outline-none",
  "font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-mid)]",
  "transition-colors duration-[var(--dur-base)] hover:text-[var(--aqua-300)]",
  "focus-visible:[outline:2px_solid_var(--focus-ring)] focus-visible:outline-offset-2",
);

/**
 * Link alle pagine legali. `Link` di next-intl antepone il locale
 * (/it/privacy, /en/cookie) e naviga lato client. Risposta calma (A′, §5.1):
 * sollevamento + luce, nessuna oscillazione.
 */
function LegalLink({ href, children }: { href: "/privacy" | "/cookie"; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        legalItemClass,
        "transition-[color,transform,filter] ease-[var(--ease-out)] hover:-translate-y-[2px] hover:brightness-110",
      )}
    >
      {children}
    </Link>
  );
}

function LegalDot() {
  return (
    <li aria-hidden="true" className="select-none px-0.5 text-[10px] text-[var(--aqua-800)]">
      ·
    </li>
  );
}

/**
 * Link che degrada in nota inerte quando il valore è ancora un placeholder
 * `TODO_*` (content/footer.ts) — mai un `href` rotto in produzione. Resta
 * comunque un elemento "tattile" (wobble) come richiesto per ogni oggetto
 * statico non banale (ART-DIRECTION §5), solo senza destinazione.
 */
function PlaceholderAware({
  value,
  href,
  note,
  external = false,
  label,
  children,
}: {
  value: string;
  href: string;
  note: string;
  external?: boolean;
  /** Testo da mostrare al posto di `children` quando il valore è un placeholder. */
  label?: string;
  children: ReactNode;
}) {
  if (isPlaceholderValue(value)) {
    return (
      <Tactile
        as="span"
        intensity="subtle"
        aria-disabled="true"
        title={note}
        className="inline-flex cursor-default items-center gap-2 text-[var(--text-low-aa)]"
      >
        {/* `label` invece di `children`: children può essere il valore grezzo
            (es. un indirizzo "TODO_…") e il marker interno
            TODO_ non deve MAI finire sotto gli occhi del cliente. */}
        <span className="border-b border-dashed border-[var(--line)] pb-px">
          {label ?? children}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[var(--ls-micro)] text-[var(--text-low-aa)]">
          {note}
        </span>
      </Tactile>
    );
  }

  return (
    <Tactile
      as="a"
      href={href}
      intensity="subtle"
      magnetic
      magneticMax={6}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        "inline-flex items-center text-[var(--text-mid)] transition-colors duration-[var(--dur-base)]",
        "hover:text-[var(--aqua-300)]",
      )}
    >
      {children}
    </Tactile>
  );
}

export default Footer;
