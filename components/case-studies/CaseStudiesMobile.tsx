"use client";

import Image from "next/image";
import { useCallback, useId, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { cn } from "@/lib/utils/cn";
import {
  CASE_LINKS,
  caseStudiesCopy,
  customComparisonRows,
  fintechDialData,
  resolveCardCopy,
  resolveDataHeadline,
  resolveDataMetrics,
  type CaseCardId,
} from "@/content/case-studies";
import { CASE_A_DETAIL_LEVEL } from "@/content/case-studies-config";
import { CaseSheet } from "./CaseSheet";
import { MobileBars, MobileDial, MobileScatter } from "./CaseMobileVisuals";
import { useSnapIndex } from "./useSnapIndex";
import styles from "./case-studies-mobile.module.css";

/** Stesso ordine non negoziabile della desktop: Data → Fintech → EdTech → Custom. */
const CARD_ORDER: CaseCardId[] = ["data", "fintech", "edtech", "custom"];

type Locale = "it" | "en";

/**
 * 04 CASE STUDIES — variante MOBILE.
 *
 * Al posto del palco 3D trascinabile: una fila orizzontale a scroll-snap nativo
 * (una card ~86vw, la successiva che fa capolino), puntini sincronizzati da un
 * IntersectionObserver. Nessuna fisica di drag in JS, nessun rAF a riposo.
 *
 * Nessun testo della desktop manca: la faccia porta tag, titolo, tagline, numero
 * eroe, le clausole della Sfida e lo strumento; tutto il resto (Sfida/Approccio/
 * Risultato integrali, chip di Approccio e Stack, metriche, prova sociale,
 * disclaimer, tabella PageSpeed) sta nel bottom sheet "Dettagli", che è SEMPRE
 * nel DOM — compresso, non cancellato.
 *
 * CTA con le stesse destinazioni della desktop (CaseCarousel.ctaHrefFor):
 * EdTech → articolo di stampa, Custom → locandacamilla.com, Data/Fintech
 * "Come funziona" → apre i dettagli della card.
 */
export function CaseStudiesMobile() {
  const locale = useLocale() as Locale;
  const copy = caseStudiesCopy[locale];
  const ui = copy.ui;
  const uid = useId();

  const scrollerRef = useRef<HTMLDivElement>(null);
  const { index, goTo } = useSnapIndex(scrollerRef, CARD_ORDER.length);

  const [sheetFor, setSheetFor] = useState<CaseCardId | null>(null);
  // l'ultima card aperta resta montata nel pannello durante l'animazione di chiusura
  const [shownFor, setShownFor] = useState<CaseCardId>("data");
  const openSheet = useCallback((id: CaseCardId) => {
    setShownFor(id);
    setSheetFor(id);
  }, []);
  const closeSheet = useCallback(() => setSheetFor(null), []);

  const dataMetrics = resolveDataMetrics(locale, CASE_A_DETAIL_LEVEL);
  const dataHeadline = resolveDataHeadline(locale, CASE_A_DETAIL_LEVEL);

  const ctaHrefFor = (id: CaseCardId) =>
    id === "edtech"
      ? CASE_LINKS.press.certaStampa
      : id === "custom"
        ? CASE_LINKS.locandaCamilla
        : undefined;

  const detailBlocksFor = (id: CaseCardId) => {
    const card = resolveCardCopy(locale, id, CASE_A_DETAIL_LEVEL);
    const blocks = [
      { label: ui.labelChallenge, text: card.challenge },
      { label: ui.labelApproach, text: card.approach },
    ];
    if (id === "data") {
      blocks.push({ label: ui.labelResult, text: `${copy.dataResultIntro} ${card.result}` });
    } else if (id === "custom") {
      blocks.push({
        label: ui.labelResult,
        text: `${copy.customResultIntro} ${copy.customResultClaim}`,
      });
    } else if (id === "edtech") {
      blocks.push(
        { label: ui.labelResult, text: card.result },
        { label: ui.pressLabel, text: copy.edtechSocialProof.pressQuote },
        { label: "LinkedIn", text: copy.edtechSocialProof.linkedinQuote },
        { label: ui.labelArticle, text: copy.edtechSocialProof.articleLabel },
      );
    } else {
      blocks.push(
        { label: ui.labelResult, text: copy.fintechResult },
        { label: ui.labelNote, text: copy.fintechDisclaimer },
      );
    }
    return blocks;
  };

  /** Righe di prova sociale. `compact` (faccia della card): solo le fonti, una
      riga ciascuna; la nota di ogni riga resta nel pannello Dettagli. */
  const proofRows = (compact: boolean) => (
    <ul className={cn(styles.proofList, compact && styles.proofListCompact)}>
      {copy.edtechProofRows.map((row, i) => (
        <li key={row.source} className={styles.proofRow}>
          <span className={styles.proofIndex}>{String(i + 1).padStart(2, "0")}</span>
          <div>
            <p className={styles.proofSource}>
              {row.links?.length
                ? row.links.map((l, j) => (
                    <span key={l.href}>
                      {j > 0 && <span aria-hidden="true"> · </span>}
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.proofLink}
                        data-track={`press:${l.label}`}
                      >
                        {l.label}
                        <span aria-hidden="true">↗</span>
                      </a>
                    </span>
                  ))
                : row.source}
            </p>
            {!compact && <p className={styles.proofNote}>{row.note}</p>}
          </div>
        </li>
      ))}
    </ul>
  );

  const renderVisual = (id: CaseCardId) => {
    switch (id) {
      case "data":
        return (
          <MobileScatter metrics={dataMetrics} caption={ui.illustrative} readout={ui.readoutData} />
        );
      case "fintech":
        return (
          <MobileDial
            score={fintechDialData.score}
            winRate={fintechDialData.winRate}
            riskReward={fintechDialData.riskReward}
            disclaimer={copy.fintechDisclaimer}
            labels={{
              score: ui.scoreCaption,
              winRate: ui.winRate,
              riskReward: ui.riskReward,
              readout: ui.readoutSignals,
            }}
          />
        );
      case "edtech":
        return (
          <div className={styles.instrument}>
            <div className={styles.instrumentHead}>
              <span className={styles.readout}>{ui.pressLabel}</span>
            </div>
            {proofRows(true)}
          </div>
        );
      case "custom":
        return (
          <a
            className={styles.shot}
            href={CASE_LINKS.locandaCamilla}
            target="_blank"
            rel="noopener noreferrer"
            data-track="case:locanda-screenshot"
            aria-label={locale === "it" ? "Apri locandacamilla.com" : "Open locandacamilla.com"}
          >
            <Image
              src="/images/case-studies/locanda-camilla-camere.webp"
              alt={
                locale === "it"
                  ? "Pagina delle camere del sito Locanda Camilla: le undici camere, ognuna con la sua galleria"
                  : "Rooms page of the Locanda Camilla website: eleven rooms, each with its own gallery"
              }
              width={1600}
              height={900}
              sizes="80vw"
              loading="lazy"
              className={styles.shotImg}
            />
            <span className={styles.shotBadge}>{ui.realScreenshot}</span>
          </a>
        );
    }
  };

  /** Contenuto extra del pannello, oltre al testo integrale. */
  const renderSheetExtra = (id: CaseCardId) => {
    switch (id) {
      case "data":
        return dataMetrics.length > 0 ? (
          <div className={styles.block}>
            <p className={styles.label}>{ui.readoutData}</p>
            <dl className={cn(styles.metrics, styles.metricsFull)}>
              {dataMetrics.map((m) => (
                <div key={m.label} className={styles.metric}>
                  <dt className={styles.metricLabel}>{m.label}</dt>
                  <dd className={styles.metricValue}>{m.formatted}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null;
      case "edtech":
        return (
          <div className={styles.block}>
            <p className={styles.label}>{ui.pressLabel}</p>
            {proofRows(false)}
            <span className={styles.badgeHi}>{copy.edtechHighlightBadge}</span>
          </div>
        );
      case "custom":
        return (
          <div className={styles.block}>
            <MobileBars
              rows={customComparisonRows}
              siteLabel={ui.siteLabel}
              industryLabel={ui.industryAvg}
              readout={ui.readoutPagespeed}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const total = CARD_ORDER.length;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section id="progetti" className={cn("section-padding", styles.section)}>
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "4%",
          left: "-30%",
          width: "120vw",
          height: "70vh",
          background: "var(--aurora-abyss)",
          opacity: 0.3,
        }}
      />

      <Container>
        <SectionHeader
          eyebrow={copy.sectionEyebrow}
          title={copy.sectionTitle}
          subtitle={copy.sectionSubtitle}
        />
      </Container>

      <div
        ref={scrollerRef}
        className={styles.track}
        role="region"
        aria-roledescription="carousel"
        aria-label={ui.carouselLabel}
      >
        {CARD_ORDER.map((id, i) => {
          const card = resolveCardCopy(locale, id, CASE_A_DETAIL_LEVEL);
          const headline = id === "data" ? dataHeadline : (card.headline ?? null);
          const href = ctaHrefFor(id);
          return (
            <article
              key={id}
              data-snap-item
              className={styles.card}
              aria-roledescription="slide"
              aria-label={`${pad(i + 1)} / ${pad(total)} — ${card.title}`}
            >
              <header className={styles.head}>
                <div className={styles.headRow}>
                  <span className={styles.tag}>{card.tag}</span>
                  <span className={styles.counter}>
                    {pad(i + 1)} / {pad(total)}
                  </span>
                </div>
                <h3 className={styles.title}>{card.title}</h3>
                <p className={styles.tagline}>{card.tagline}</p>
              </header>

              <div className={styles.hero}>
                <p className={styles.label}>{card.brief.resultLead}</p>
                {headline ? (
                  <div className={styles.heroMain}>
                    <span className={styles.heroValue}>{headline.value}</span>
                    <p className={styles.heroSub}>
                      <span className={styles.heroSubStrong}>{headline.label}</span>
                      {headline.sub ? ` — ${headline.sub}` : ""}
                    </p>
                  </div>
                ) : (
                  <p className={styles.heroText}>{card.result}</p>
                )}
              </div>

              <div className={styles.block}>
                <p className={styles.label}>{ui.labelChallenge}</p>
                <ul className={styles.points}>
                  {/* due clausole sulla faccia; la Sfida integrale è nel pannello */}
                  {card.brief.challengePoints.slice(0, 2).map((p) => (
                    <li key={p} className={styles.point}>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.visual}>{renderVisual(id)}</div>

              <div className={styles.footer}>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.cta}
                  >
                    {card.ctaLabel}
                    <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    className={styles.cta}
                    onClick={() => openSheet(id)}
                    aria-haspopup="dialog"
                  >
                    {card.ctaLabel}
                    <span aria-hidden="true">→</span>
                  </button>
                )}
                {/* "Dettagli": cerchio "+" con nome accessibile — accanto a una CTA
                    lunga ("Leggi la copertura stampa") il bottone testuale
                    mandava a capo la fila e allungava tutte le card. */}
                <button
                  type="button"
                  className={styles.detailsBtn}
                  onClick={() => openSheet(id)}
                  aria-haspopup="dialog"
                  aria-label={`${ui.detailsOpen} — ${card.title}`}
                  title={ui.detailsOpen}
                >
                  <span aria-hidden="true" className={styles.detailsIcon} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <Container>
        <div className={styles.pager}>
          <span className={styles.counter} aria-live="polite">
            {pad(index + 1)} / {pad(total)}
          </span>
          <div className={styles.dots}>
            {CARD_ORDER.map((id, i) => (
              <button
                key={id}
                type="button"
                className={styles.dotBtn}
                aria-label={`${ui.goTo} ${resolveCardCopy(locale, id, CASE_A_DETAIL_LEVEL).title}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => goTo(i)}
              >
                <span className={styles.dotBar} data-active={i === index ? "" : undefined} />
              </button>
            ))}
          </div>
        </div>
      </Container>

      <CaseSheet
        open={sheetFor !== null}
        onClose={closeSheet}
        labelledBy={`${uid}-${shownFor}`}
        headLabel={ui.detailsTitle}
        closeLabel={ui.detailsClose}
      >
        {CARD_ORDER.map((id) => {
          const card = resolveCardCopy(locale, id, CASE_A_DETAIL_LEVEL);
          return (
            <div key={id} hidden={id !== shownFor} className={styles.sheetPanel}>
              <span className={styles.tag}>{card.tag}</span>
              <h3 id={`${uid}-${id}`} className={styles.sheetTitle}>
                {card.title}
              </h3>

              <div className={styles.block}>
                <p className={styles.label}>{ui.labelApproach}</p>
                <div className={styles.chips}>
                  {card.brief.approachChips.map((chip) => (
                    <span key={chip} className={styles.chip}>
                      {chip}
                    </span>
                  ))}
                  {card.brief.stack?.map((chip) => (
                    <span key={chip} className={cn(styles.chip, styles.chipStack)}>
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              {detailBlocksFor(id).map((b) => (
                <div key={b.label} className={styles.block}>
                  <p className={styles.label}>{b.label}</p>
                  <p className={styles.detailsText}>{b.text}</p>
                </div>
              ))}

              {renderSheetExtra(id)}
            </div>
          );
        })}
      </CaseSheet>
    </section>
  );
}

export default CaseStudiesMobile;
