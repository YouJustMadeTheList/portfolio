"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useIsMobileVariant } from "@/components/variant/VariantProvider";
import { consentCopy, type LegalLocale } from "@/content/legal";
import { privacySignal, readConsent, writeConsent, type ConsentValue } from "@/lib/analytics/consent";

/**
 * Banner del consenso (Garante 10/6/2021): Accetta e Rifiuta hanno lo stesso
 * peso visivo, chiudere senza scegliere non vale come consenso, la scelta si
 * cambia in ogni momento dall'evento globale `consent:open` (footer, cookie policy).
 *
 * Card in vetro in basso a destra su desktop. Variante mobile ("m"): un foglio
 * compatto ancorato al bordo inferiore (≤ ~20% del viewport) — una frase, il
 * link alla policy, Rifiuta/Accetta sulla stessa riga con lo stesso peso,
 * "Preferenze" piccolo sotto; rispetta la safe-area del telefono.
 *
 * Visibilità pubblicata a tutta la pagina: `data-consent="open"` su <html> +
 * evento `consent:visibility` ({ open }), così la barra d'azione dei contatti
 * (ContactActionBar) si nasconde e non copre mai questi bottoni.
 */
type View = "hidden" | "banner" | "details";

export function ConsentBanner() {
  const locale = (useLocale() === "en" ? "en" : "it") as LegalLocale;
  const t = consentCopy[locale];
  const tm = useTranslations("consent");
  const mobile = useIsMobileVariant();
  const [view, setView] = useState<View>("hidden");
  const [analytics, setAnalytics] = useState(false);
  const [entered, setEntered] = useState(false);
  const titleId = useId();
  const bodyId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const open = useCallback((next: View, focus: boolean) => {
    setAnalytics(readConsent() === "granted");
    setView(next);
    if (focus) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus());
    }
  }, []);

  const close = useCallback(() => {
    setView("hidden");
    setEntered(false);
    returnFocus.current?.focus?.();
    returnFocus.current = null;
  }, []);

  const choose = useCallback(
    (value: ConsentValue) => {
      writeConsent(value);
      close();
    },
    [close],
  );

  // Primo ingresso: mostra se non c'e' una scelta valida e il browser non
  // chiede gia' di non essere tracciato (DNT/GPC = rifiuto implicito).
  useEffect(() => {
    let timer: number | undefined;
    let onScroll: (() => void) | undefined;
    if (readConsent() === "unset" && !privacySignal()) {
      // Mobile, home: l'hero occupa piu' di uno schermo e le sue CTA stanno in
      // basso. Il banner compare solo dopo che l'utente ha iniziato a scorrere,
      // cosi' non le copre mai. Prima della scelta il tracker resta anonimo.
      const isHome = /^\/(it|en)\/?$/.test(window.location.pathname);
      const isMobile = window.matchMedia("(max-width: 639px)").matches;
      if (isHome && isMobile && window.scrollY < window.innerHeight * 0.6) {
        onScroll = () => {
          if (window.scrollY < window.innerHeight * 0.6) return;
          window.removeEventListener("scroll", onScroll!);
          open("banner", false);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
      } else {
        timer = window.setTimeout(() => open("banner", false), 900);
      }
    }
    const onOpen = () => open("details", true);
    window.addEventListener("consent:open", onOpen);
    return () => {
      window.clearTimeout(timer);
      if (onScroll) window.removeEventListener("scroll", onScroll);
      window.removeEventListener("consent:open", onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (view === "hidden") return;
    const raf = requestAnimationFrame(() => setEntered(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [view, close]);

  // Pubblica lo stato aperto/chiuso (vedi docblock): la ContactActionBar ascolta.
  useEffect(() => {
    const isOpen = view !== "hidden";
    const root = document.documentElement;
    if (isOpen) root.dataset.consent = "open";
    else delete root.dataset.consent;
    window.dispatchEvent(new CustomEvent("consent:visibility", { detail: { open: isOpen } }));
  }, [view]);

  useEffect(
    () => () => {
      delete document.documentElement.dataset.consent;
    },
    [],
  );

  if (view === "hidden") return null;

  const btn =
    "inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-5 text-[14px] font-medium tracking-[0.01em] " +
    "transition-[transform,filter,background-color,border-color,box-shadow] duration-[220ms] ease-[var(--ease-out)] " +
    "motion-safe:hover:-translate-y-[2px] hover:brightness-110 active:translate-y-0 active:scale-[0.97] " +
    "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--focus-ring)]";
  // Stesso peso per Accetta e Rifiuta: stessa forma, stessa dimensione, stesso contrasto.
  const choiceBtn = `${btn} border border-[var(--line-hi)] bg-[rgb(var(--aqua-rgb)/0.08)] text-[var(--text-hi)] hover:border-[var(--aqua-400)] hover:bg-[rgb(var(--aqua-rgb)/0.16)] hover:shadow-[var(--glow-xs)]`;
  const linkBtn =
    "rounded-[var(--radius-xs)] font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[var(--ls-micro)] text-[var(--text-mid)] underline-offset-4 transition-colors hover:text-[var(--aqua-300)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

  if (mobile) {
    return (
      <MobileConsentSheet
        rootRef={rootRef}
        titleId={titleId}
        bodyId={bodyId}
        entered={entered}
        view={view}
        locale={locale}
        t={t}
        shortBody={tm("shortBody")}
        analytics={analytics}
        setAnalytics={setAnalytics}
        choose={choose}
        close={close}
        openDetails={() => open("details", false)}
      />
    );
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      data-consent-banner=""
      data-no-track=""
      data-lenis-prevent=""
      className={
        "!fixed z-[var(--z-toast)] bottom-3 left-3 right-3 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[420px] " +
        "glass-surface !rounded-[var(--radius-lg)] p-5 sm:p-6 shadow-[var(--shadow-float)] " +
        "motion-safe:transition-[opacity,transform] motion-safe:duration-[520ms] motion-safe:ease-[var(--ease-out)] " +
        (entered ? "opacity-100 translate-y-0" : "opacity-0 motion-safe:translate-y-4")
      }
      style={{
        maxHeight: "calc(100svh - 24px)",
        overflowY: "auto",
        // Piu' opaco del vetro standard: il testo della pagina sotto non deve trasparire.
        background: "linear-gradient(160deg, rgba(17, 30, 37, 0.97), rgba(7, 14, 19, 0.95))",
        backdropFilter: "blur(18px) saturate(1.2)",
        WebkitBackdropFilter: "blur(18px) saturate(1.2)",
      }}
    >
      <p className="mb-2 flex items-center gap-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[var(--ls-micro)] text-[var(--text-low)]">
        <span aria-hidden="true" className="h-px w-6 bg-[var(--aqua-400)] shadow-[var(--glow-xs)]" />
        {t.label}
      </p>

      {view === "banner" ? (
        <>
          <h2 id={titleId} className="font-[family-name:var(--font-display)] text-[1.15rem] leading-tight text-[var(--text-hi)]">
            {t.title}
          </h2>
          <p id={bodyId} className="mt-2 text-[13.5px] leading-[1.55] text-[var(--text-mid)]">
            {t.body}{" "}
            <a href={`/${locale}/cookie`} className="text-[var(--aqua-300)] underline decoration-[var(--line-hi)] underline-offset-4 hover:decoration-[var(--aqua-400)]">
              {t.policyLink}
            </a>
          </p>
          <div className="mt-4 flex gap-3">
            <button type="button" className={choiceBtn} onClick={() => choose("denied")} data-autofocus="">
              {t.decline}
            </button>
            <button type="button" className={choiceBtn} onClick={() => choose("granted")}>
              {t.accept}
            </button>
          </div>
          <div className="mt-3 flex justify-center">
            <button type="button" className={linkBtn} onClick={() => open("details", false)}>
              {t.preferences}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} tabIndex={-1} data-autofocus="" style={{ outline: "none" }} className="font-[family-name:var(--font-display)] text-[1.15rem] leading-tight text-[var(--text-hi)]">
              {t.detailsTitle}
            </h2>
            <button type="button" onClick={close} aria-label={t.close} className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-[var(--text-mid)] transition-colors hover:bg-[rgb(var(--aqua-rgb)/0.1)] hover:text-[var(--text-hi)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>
          <div id={bodyId} className="mt-4 space-y-3">
            <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgb(var(--void-rgb)/0.35)] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] font-medium text-[var(--text-hi)]">{t.necessaryTitle}</p>
                <span className="shrink-0 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.12em] text-[var(--text-low)]">{t.alwaysOn}</span>
              </div>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--text-mid)]">{t.necessaryBody}</p>
            </div>
            <label className="block cursor-pointer rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgb(var(--void-rgb)/0.35)] p-3.5 transition-colors hover:border-[var(--line-hi)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus-ring)]">
              <span className="flex items-center justify-between gap-3">
                <span className="text-[14px] font-medium text-[var(--text-hi)]">{t.analyticsTitle}</span>
                <span className="relative inline-flex shrink-0 items-center">
                  <input
                    type="checkbox"
                    role="switch"
                    className="peer sr-only"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                  />
                  <span aria-hidden="true" className="h-6 w-11 rounded-full border border-[var(--line-hi)] bg-[var(--raised)] transition-colors peer-checked:border-[var(--aqua-400)] peer-checked:bg-[rgb(var(--aqua-rgb)/0.28)]" />
                  <span aria-hidden="true" className="absolute left-[3px] size-[18px] rounded-full bg-[var(--text-mid)] transition-[transform,background-color] duration-200 peer-checked:translate-x-5 peer-checked:bg-[var(--aqua-400)] peer-checked:shadow-[var(--glow-xs)]" />
                </span>
              </span>
              <span className="mt-1 block text-[12.5px] leading-[1.5] text-[var(--text-mid)]">{t.analyticsBody}</span>
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" className={choiceBtn} onClick={() => choose("denied")}>
              {t.decline}
            </button>
            <button type="button" className={choiceBtn} onClick={() => choose(analytics ? "granted" : "denied")}>
              {t.save}
            </button>
          </div>
          <div className="mt-3 flex justify-center">
            <a href={`/${locale}/cookie`} className={linkBtn}>
              {t.policyLink}
            </a>
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Variante mobile — foglio compatto in basso. Nessun backdrop-filter, solo
   opacity/transform in ingresso. Stesso contenuto legale della desktop: la
   frase breve rimanda alla policy, il dettaglio completo è in "Preferenze".
   -------------------------------------------------------------------------- */
function MobileConsentSheet({
  rootRef,
  titleId,
  bodyId,
  entered,
  view,
  locale,
  t,
  shortBody,
  analytics,
  setAnalytics,
  choose,
  close,
  openDetails,
}: {
  rootRef: React.RefObject<HTMLDivElement | null>;
  titleId: string;
  bodyId: string;
  entered: boolean;
  view: Exclude<View, "hidden">;
  locale: LegalLocale;
  t: (typeof consentCopy)[LegalLocale];
  shortBody: string;
  analytics: boolean;
  setAnalytics: (v: boolean) => void;
  choose: (v: ConsentValue) => void;
  close: () => void;
  openDetails: () => void;
}) {
  // Bottoni gemelli: stessa forma, dimensione e contrasto (Garante). Solo
  // feedback al tocco (active), nessun hover su un dispositivo touch.
  const choiceBtn =
    "inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[var(--line-hi)] bg-[rgb(var(--aqua-rgb)/0.1)] px-4 text-[15px] font-medium text-[var(--text-hi)] " +
    "transition-transform duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";
  const smallLink =
    "inline-flex min-h-8 items-center px-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[var(--ls-micro)] text-[var(--text-mid)] underline-offset-4 active:text-[var(--aqua-300)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]";

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      data-consent-banner=""
      data-no-track=""
      className={
        "fixed inset-x-0 bottom-0 z-[var(--z-toast)] rounded-t-[20px] border-t border-[var(--line-hi)] px-4 pt-3 " +
        "shadow-[0_-18px_40px_-12px_rgba(0,0,0,0.85)] motion-safe:transition-[opacity,transform] motion-safe:duration-[420ms] motion-safe:ease-[var(--ease-out)] " +
        (entered ? "translate-y-0 opacity-100" : "opacity-0 motion-safe:translate-y-6")
      }
      style={{
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        maxHeight: view === "details" ? "min(86svh, 560px)" : undefined,
        overflowY: view === "details" ? "auto" : undefined,
        overscrollBehavior: "contain",
        background: "linear-gradient(180deg, rgb(15, 27, 33), rgb(7, 13, 17))",
      }}
    >
      {view === "banner" ? (
        <>
          <p id={bodyId} className="text-[13.5px] leading-[1.45] text-[var(--text-mid)] [text-wrap:pretty]">
            <strong id={titleId} className="font-medium text-[var(--text-hi)]">
              {t.title}.
            </strong>{" "}
            {shortBody}{" "}
            <a
              href={`/${locale}/cookie`}
              className="whitespace-nowrap text-[var(--aqua-300)] underline decoration-[var(--line-hi)] underline-offset-4"
            >
              {t.policyLink}
            </a>
            <span aria-hidden="true" className="px-1.5 text-[var(--aqua-800)]">
              ·
            </span>
            {/* "Preferenze": piccolo, in coda alla frase — il peso visivo resta
                tutto ai due bottoni gemelli. Area di tocco allargata col padding. */}
            <button
              type="button"
              onClick={openDetails}
              className="-my-2 inline-block py-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-[var(--text-mid)] underline decoration-[var(--line)] underline-offset-4 outline-none focus-visible:[outline:2px_solid_var(--focus-ring)]"
            >
              {t.preferences}
            </button>
          </p>
          <div className="mt-3 flex gap-2.5">
            <button type="button" className={choiceBtn} onClick={() => choose("denied")} data-autofocus="">
              {t.decline}
            </button>
            <button type="button" className={choiceBtn} onClick={() => choose("granted")}>
              {t.accept}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <h2
              id={titleId}
              tabIndex={-1}
              data-autofocus=""
              style={{ outline: "none" }}
              className="font-[family-name:var(--font-display)] text-[1.05rem] leading-tight text-[var(--text-hi)]"
            >
              {t.detailsTitle}
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label={t.close}
              className="-mr-1.5 grid size-11 shrink-0 place-items-center rounded-full text-[var(--text-mid)] active:bg-[rgb(var(--aqua-rgb)/0.1)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>
          <div id={bodyId} className="mt-2 space-y-2.5">
            <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgb(var(--void-rgb)/0.35)] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] font-medium text-[var(--text-hi)]">{t.necessaryTitle}</p>
                <span className="shrink-0 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.12em] text-[var(--text-low)]">{t.alwaysOn}</span>
              </div>
              <p className="mt-1 text-[13px] leading-[1.45] text-[var(--text-mid)]">{t.necessaryBody}</p>
            </div>
            <label className="block rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgb(var(--void-rgb)/0.35)] p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus-ring)]">
              <span className="flex items-center justify-between gap-3">
                <span className="text-[14px] font-medium text-[var(--text-hi)]">{t.analyticsTitle}</span>
                <span className="relative inline-flex shrink-0 items-center">
                  <input
                    type="checkbox"
                    role="switch"
                    className="peer sr-only"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                  />
                  <span aria-hidden="true" className="h-7 w-12 rounded-full border border-[var(--line-hi)] bg-[var(--raised)] transition-colors peer-checked:border-[var(--aqua-400)] peer-checked:bg-[rgb(var(--aqua-rgb)/0.28)]" />
                  <span aria-hidden="true" className="absolute left-[4px] size-[20px] rounded-full bg-[var(--text-mid)] transition-transform duration-200 peer-checked:translate-x-5 peer-checked:bg-[var(--aqua-400)]" />
                </span>
              </span>
              <span className="mt-1 block text-[13px] leading-[1.45] text-[var(--text-mid)]">{t.analyticsBody}</span>
            </label>
          </div>
          <div className="mt-3 flex gap-2.5">
            <button type="button" className={choiceBtn} onClick={() => choose("denied")}>
              {t.decline}
            </button>
            <button type="button" className={choiceBtn} onClick={() => choose(analytics ? "granted" : "denied")}>
              {t.save}
            </button>
          </div>
          <div className="mt-1 flex justify-center">
            <a href={`/${locale}/cookie`} className={smallLink}>
              {t.policyLink}
            </a>
          </div>
        </>
      )}
    </div>
  );
}

export default ConsentBanner;
