"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils/cn";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { trustItems, trustBarCopy, trustItemName, type Locale } from "@/content/trust-bar";
import styles from "./TrustBarMobile.module.css";

/** Sfasamento tra un'accensione e la successiva nell'intro (ms). */
const LIGHT_STAGGER = 110;

/**
 * 02 TRUST BAR — variante MOBILE (telefoni; il tablet riceve la desktop).
 *
 * Stesse 7 tappe, stesso titolo, stesso ordine cronologico; la cronologia
 * verticale diventa una striscia orizzontale da sfogliare:
 *  · CSS scroll-snap + inerzia nativa, la tappa successiva sbircia dal bordo;
 *  · una guida sotto la striscia si accende man mano che si sfoglia (frazione
 *    di tappe già viste), con la testa luminosa sul fronte — la "scia" della
 *    desktop, fatta con un scaleX e un translate;
 *  · ogni tappa si accende quando entra nella striscia (IntersectionObserver
 *    con root = striscia), e resta accesa: la guida "ricorda" la luce.
 * Scroll listener passivo, lettura di scrollLeft + scrittura di transform in
 * un solo rAF, misure solo al resize. Reduced-motion: tutto acceso, nessuna
 * transizione.
 */
export function TrustBarMobile() {
  const locale = useLocale() as Locale;
  const copy = trustBarCopy[locale] ?? trustBarCopy.it;
  const reducedMotion = usePrefersReducedMotion();

  const sectionRef = useRef<HTMLElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const headRef = useRef<HTMLSpanElement | null>(null);

  const stops = useMemo(() => [...trustItems].sort((a, b) => a.order - b.order), []);

  useEffect(() => {
    const section = sectionRef.current;
    const scroller = scrollerRef.current;
    const progress = progressRef.current;
    const fill = fillRef.current;
    const head = headRef.current;
    if (!section || !scroller || !progress || !fill || !head) return;
    const items = Array.from(scroller.querySelectorAll<HTMLLIElement>("[data-stop]"));

    // --- misure (solo al resize) ---
    let maxScroll = 0;
    let viewW = 0;
    let contentW = 1;
    let railW = 0;
    const measure = () => {
      viewW = scroller.clientWidth;
      contentW = Math.max(1, scroller.scrollWidth);
      maxScroll = Math.max(0, contentW - viewW);
      railW = progress.clientWidth;
    };

    // Frazione di striscia "vista": 0.3 all'inizio (le prime tappe sono già
    // sotto gli occhi), 1 in fondo.
    const fraction = (left: number) =>
      maxScroll <= 0 ? 1 : Math.min(1, (left + viewW) / contentW);

    const paint = (p: number) => {
      fill.style.transform = `scaleX(${p})`;
      head.style.transform = `translate3d(${p * railW}px, 0, 0)`;
    };

    measure();

    if (reducedMotion) {
      for (const li of items) li.dataset.lit = "true";
      progress.dataset.on = "true";
      paint(1);
      return;
    }

    let raf = 0;
    let intro = true;
    const onScroll = () => {
      if (raf || intro) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        paint(fraction(scroller.scrollLeft));
      });
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });

    // accensione tappa per tappa, dentro la striscia
    let lightIo: IntersectionObserver | null = null;
    const startLighting = () => {
      lightIo = new IntersectionObserver(
        (entries) => {
          let k = 0;
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const li = e.target as HTMLLIElement;
            li.style.setProperty("--d", `${(intro ? k : Math.min(k, 1)) * LIGHT_STAGGER}ms`);
            li.dataset.lit = "true";
            lightIo?.unobserve(li);
            k += 1;
          }
        },
        { root: scroller, threshold: 0.3 },
      );
      for (const li of items) lightIo.observe(li);
    };

    // intro: quando la sezione entra, la scia parte da zero e arriva alle
    // tappe visibili; poi la guida segue lo scorrimento senza transizioni
    let introTimer = 0;
    const sectionIo = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        sectionIo.disconnect();
        progress.dataset.intro = "true";
        progress.dataset.on = "true";
        // doppio rAF: lo stato 0 deve essere dipinto prima della transizione
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            paint(fraction(scroller.scrollLeft));
            startLighting();
          }),
        );
        introTimer = window.setTimeout(() => {
          intro = false;
          delete progress.dataset.intro;
          paint(fraction(scroller.scrollLeft));
        }, 950);
      },
      { threshold: 0.35 },
    );
    sectionIo.observe(section);

    let lastW = 0;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w === lastW) return;
      lastW = w;
      measure();
      if (!intro) paint(fraction(scroller.scrollLeft));
    });
    ro.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(introTimer);
      sectionIo.disconnect();
      lightIo?.disconnect();
      ro.disconnect();
    };
  }, [reducedMotion]);

  return (
    <section
      id="percorso-tappe"
      ref={sectionRef}
      aria-label={copy.ariaLabelSection}
      className={cn(styles.section, reducedMotion && styles.reduced)}
    >
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "-30%",
          left: "10%",
          width: "92vw",
          height: "70%",
          background: "var(--aurora-aqua)",
          opacity: 0.3,
        }}
      />

      <Container>
        <h2 className={styles.heading}>
          {copy.headingLead}{" "}
          <em className="serif-accent">{copy.headingAccent}</em>
        </h2>
      </Container>

      <div
        ref={scrollerRef}
        className={styles.scroller}
        role="region"
        aria-label={copy.timelineLabel}
        tabIndex={0}
      >
        <ol className={styles.track} aria-label={copy.timelineLabel}>
          {stops.map((item, index) => {
            const name = trustItemName(item, locale);
            const groupLabel = copy.groupLabels[item.category];
            const showImage = item.status === "verified" && Boolean(item.logoUrl);
            const inner = (
              <>
                <span className={styles.meta}>
                  <span className={styles.index} aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{groupLabel}</span>
                </span>
                {showImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.logoUrl}
                    alt={item.logoAlt ?? name}
                    className={styles.logoImg}
                    loading="lazy"
                  />
                ) : (
                  <span className={styles.label}>{name}</span>
                )}
                {item.externalUrl ? (
                  <span aria-hidden="true" className={styles.ext}>
                    ↗
                  </span>
                ) : null}
              </>
            );
            return (
              <li
                key={item.id}
                data-stop
                data-lit={reducedMotion ? "true" : undefined}
                className={styles.stop}
                style={{ "--d": "0ms" } as CSSProperties}
              >
                <span aria-hidden="true" className={styles.node} />
                {item.externalUrl ? (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.card}
                    aria-label={`${name} — ${groupLabel}`}
                  >
                    {inner}
                  </a>
                ) : (
                  <div className={styles.card}>{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div ref={progressRef} aria-hidden="true" className={styles.progress}>
        <span ref={fillRef} className={styles.fill} />
        <span ref={headRef} className={styles.head} />
      </div>
    </section>
  );
}
