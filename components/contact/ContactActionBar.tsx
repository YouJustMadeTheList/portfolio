"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { smoothScrollTo } from "@/components/fx/scrollTo";
import { contactCopy, isPlaceholderValue, phoneHref, whatsappUrl } from "@/content/contact";
import { cn } from "@/lib/utils/cn";

const subscribeNoop = () => () => {};

/** Id dell'ancora del modulo (colonna del form in ContactSection). */
export const CONTACT_FORM_ANCHOR = "contatti-modulo";

/**
 * Barra d'azione fissa della variante MOBILE: Chiama · WhatsApp · Scrivi.
 *
 * Visibile solo quando serve:
 *  - dopo l'hero (l'hero ha le sue CTA: la barra non le duplica);
 *  - MAI mentre la sezione Contatti è a schermo (lì c'è già tutto);
 *  - MAI mentre il banner del consenso è aperto (`data-consent="open"` /
 *    evento `consent:visibility`), così non ne copre i bottoni.
 *
 * Montata da ContactSection (solo variante "m") in un portal su <body>: il
 * `position: fixed` non dipende da trasformazioni degli antenati.
 * Performance: due IntersectionObserver, nessun listener di scroll; l'entrata
 * anima solo transform/opacity; nessun backdrop-filter.
 */
export function ContactActionBar({ locale }: { locale: "it" | "en" }) {
  const copy = contactCopy[locale].actionBar;
  // Portal solo dopo l'idratazione (document.body non esiste sul server).
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const [pastHero, setPastHero] = useState(false);
  const [contactInView, setContactInView] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    const hero = document.getElementById("hero");
    if (hero) {
      const io = new IntersectionObserver(
        ([entry]) => {
          // "Passato" solo se l'hero è uscito verso l'ALTO, non se non è ancora arrivato.
          setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        },
        // Compare quando l'ultimo quarto di schermo dell'hero è ormai sopra la piega.
        { rootMargin: "0px 0px -75% 0px" },
      );
      io.observe(hero);
      observers.push(io);
    }

    const contact = document.getElementById("contatti");
    if (contact) {
      const io = new IntersectionObserver(
        ([entry]) => setContactInView(entry.isIntersecting),
        // Si ritira appena la sezione entra nel quinto inferiore dello schermo.
        { rootMargin: "0px 0px -18% 0px" },
      );
      io.observe(contact);
      observers.push(io);
    }

    const syncConsent = () => setConsentOpen(document.documentElement.dataset.consent === "open");
    // Stato iniziale letto in un frame successivo (non in modo sincrono nell'effetto).
    const raf = requestAnimationFrame(syncConsent);
    window.addEventListener("consent:visibility", syncConsent);

    return () => {
      cancelAnimationFrame(raf);
      observers.forEach((o) => o.disconnect());
      window.removeEventListener("consent:visibility", syncConsent);
    };
  }, []);

  // Senza hero (pagina diversa dalla home) la barra è disponibile da subito.
  const [hasHero] = useState(() => typeof document === "undefined" || Boolean(document.getElementById("hero")));
  const visible = (pastHero || !hasHero) && !contactInView && !consentOpen;

  if (!mounted) return null;

  const hasPhone = !isPlaceholderValue(phoneHref);
  const hasWhatsapp = !isPlaceholderValue(whatsappUrl);

  return createPortal(
    <nav
      aria-label={copy.label}
      aria-hidden={visible ? undefined : true}
      inert={!visible}
      data-contact-action-bar=""
      className={cn(
        "fixed inset-x-3 z-[90] flex gap-2 rounded-[20px] border border-[var(--line-hi)] p-1.5",
        "shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9),0_0_0_1px_rgba(63,233,204,0.05)]",
        "transition-[transform,opacity] duration-300 ease-[var(--ease-out)] will-change-transform",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[calc(100%+24px)] opacity-0",
      )}
      style={{
        bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
        background: "linear-gradient(180deg, rgb(16, 28, 34), rgb(8, 15, 20))",
      }}
    >
      {hasPhone ? (
        <ActionLink href={phoneHref} label={copy.call} track="actionbar-call" icon={<PhoneIcon />} />
      ) : null}
      {hasWhatsapp ? (
        <ActionLink
          href={whatsappUrl}
          label={copy.whatsapp}
          track="actionbar-whatsapp"
          external
          icon={<WhatsappIcon />}
        />
      ) : null}
      <a
        href={`#${CONTACT_FORM_ANCHOR}`}
        data-track="actionbar-write"
        onClick={(e) => {
          e.preventDefault();
          const target = document.getElementById(CONTACT_FORM_ANCHOR);
          if (target) smoothScrollTo(target);
        }}
        className={cn(
          actionClass,
          "bg-[linear-gradient(135deg,var(--aqua-300),var(--aqua-500))] text-[var(--void)] shadow-[var(--glow-xs)]",
        )}
      >
        <PenIcon />
        {copy.write}
      </a>
    </nav>,
    document.body,
  );
}

const actionClass = cn(
  "flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-[14px] px-2",
  "font-[family-name:var(--font-body)] text-[15px] font-semibold tracking-[0.005em]",
  "select-none outline-none transition-transform duration-150 active:scale-[0.96]",
  "[-webkit-tap-highlight-color:transparent]",
  "focus-visible:[outline:2px_solid_var(--focus-ring)] focus-visible:outline-offset-2",
);

function ActionLink({
  href,
  label,
  icon,
  track,
  external = false,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  track: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      data-track={track}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        actionClass,
        "border border-[var(--line)] bg-[rgb(var(--aqua-rgb)/0.07)] text-[var(--text-hi)] active:bg-[rgb(var(--aqua-rgb)/0.14)]",
      )}
    >
      {icon}
      {label}
    </a>
  );
}

function Icon({ children, stroke = "var(--aqua-400)" }: { children: ReactNode; stroke?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

function PhoneIcon() {
  return (
    <Icon>
      <path d="M6.6 3.5h2.6l1.4 4-2 1.3a11 11 0 0 0 6.6 6.6l1.3-2 4 1.4v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" />
    </Icon>
  );
}

function WhatsappIcon() {
  return (
    <Icon>
      <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8Z" />
      <path d="M9.2 9.1c.2 1.9 1.8 3.6 3.7 3.8l1-1 1.6.7-.2 1.2a1.2 1.2 0 0 1-1.3.9 6.4 6.4 0 0 1-5.8-5.8 1.2 1.2 0 0 1 .9-1.3l1.2-.2.7 1.6Z" />
    </Icon>
  );
}

function PenIcon() {
  return (
    <Icon stroke="currentColor">
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="M13.5 6.5l4 4" />
    </Icon>
  );
}

export default ContactActionBar;
