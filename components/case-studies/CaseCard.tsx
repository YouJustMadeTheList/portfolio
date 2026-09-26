"use client";

import { useId, useState, type MouseEventHandler, type ReactNode } from "react";
import { Tactile } from "@/components/ui/Tactile";
import { cn } from "@/lib/utils/cn";
import type {
  CaseCardCopy,
  CaseCardId,
  CaseHeadline,
  CaseStudiesUi,
} from "@/content/case-studies";
import styles from "./case-studies.module.css";

export type CasePosition = "foreground" | "adjacent-prev" | "adjacent-next" | "hidden";

export type CaseDetailBlock = { label: string; text: string };

export type CaseCardProps = {
  id: CaseCardId;
  copy: CaseCardCopy;
  accentVisual: "scatter" | "dial" | "social-proof" | "screenshot+chart";
  reducedMotion: boolean;
  position: CasePosition;
  children?: ReactNode; // slot per la data-viz specifica della card
  ui: CaseStudiesUi;
  /** Numero-eroe risolto dal chiamante (per la Card A dipende da CASE_A_DETAIL_LEVEL). */
  headline: CaseHeadline | null;
  /** Testo mostrato al posto del numero-eroe quando non c'è nessun numero da mostrare. */
  headlineFallback?: string;
  /** Testo integrale dietro la disclosure: nulla è stato tolto dal sito, solo spostato. */
  detailBlocks: CaseDetailBlock[];
  index: number;
  total: number;
  onCtaClick?: MouseEventHandler;
  ctaHref?: string;
};

/**
 * Faccia di una card del carosello.
 *
 * La v1 metteva a riposo tre paragrafi lunghi (Sfida/Approccio/Risultato) uno
 * sotto l'altro: un muro di testo illeggibile a colpo d'occhio. Qui la faccia
 * porta solo tag, titolo, la tagline-firma in serif italic aqua, il numero-eroe
 * e le clausole brevi di Sfida/Approccio; il testo integrale vive nel pannello
 * "Dettagli", che si apre sul posto (ART-DIRECTION §6).
 *
 * Il posizionamento 3D NON è qui: lo applica CaseCarousel allo slot che contiene
 * questa card, così l'elemento tattile e l'elemento animato restano distinti e
 * le due trasformazioni non si sovrascrivono.
 */
export function CaseCard({
  id,
  copy,
  accentVisual,
  reducedMotion,
  position,
  children,
  ui,
  headline,
  headlineFallback,
  detailBlocks,
  index,
  total,
  onCtaClick,
  ctaHref,
}: CaseCardProps) {
  const isForeground = position === "foreground";
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [wasForeground, setWasForeground] = useState(isForeground);
  const detailsId = useId();

  // La card che esce dal primo piano chiude il proprio pannello: mai un pannello
  // aperto su una card arretrata, illeggibile e fuori dal flusso di lettura.
  // Aggiustamento di stato in fase di render (pattern React per "prop cambiata"),
  // non un effetto: non serve un giro di rendering in più.
  if (wasForeground !== isForeground) {
    setWasForeground(isForeground);
    if (!isForeground && detailsOpen) setDetailsOpen(false);
  }

  const counter = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  const isExternal = Boolean(ctaHref?.startsWith("http"));

  return (
    <Tactile
      as="article"
      intensity="subtle"
      wobble={isForeground && !reducedMotion}
      squash={false}
      tilt3d={isForeground && !reducedMotion}
      tiltMax={7}
      className={styles.card}
      aria-label={copy.title}
    >
      <div className={styles.body} data-case-body={id}>
        <header className={styles.head}>
          <div className={styles.headRow}>
            <span className={styles.tag}>{copy.tag}</span>
            <span className={cn(styles.counter, isForeground && styles.counterActive)}>
              {counter}
            </span>
          </div>
          <h3 className={styles.title}>{copy.title}</h3>
          {/* la firma della card: pattern "Trasformo X in Y", serif italic aqua */}
          <p className={styles.tagline}>{copy.tagline}</p>
        </header>

        {/* Risultato — l'eroe visivo della card */}
        <div className={styles.hero}>
          <p className={styles.heroLabel}>{copy.brief.resultLead}</p>
          {headline ? (
            <div className={styles.heroMain}>
              <span className={styles.heroValue}>{headline.value}</span>
              <p className={styles.heroSub}>
                <span className={styles.heroSubStrong}>{headline.label}</span>
                {headline.sub ? ` — ${headline.sub}` : ""}
              </p>
            </div>
          ) : (
            /* livello "no-numbers": nessuna cifra, il testo del livello al suo posto */
            <p className={styles.heroText}>{headlineFallback ?? copy.result}</p>
          )}
        </div>

        <div className={styles.split}>
          {/* Sfida: clausole brevi. Sotto 560px la colonna sparisce dalla faccia
              e resta (integrale) nel pannello Dettagli — vedi nota in fondo. */}
          <section className={cn(styles.block, styles.proseCol)}>
            <p className={styles.label}>{ui.labelChallenge}</p>
            <ul className={styles.points}>
              {copy.brief.challengePoints.map((point) => (
                <li key={point} className={styles.point}>
                  {point}
                </li>
              ))}
            </ul>
          </section>

          <div className={styles.visualCol} data-case-visual={accentVisual}>
            {children}
          </div>
        </div>

        <section className={cn(styles.block, styles.proseCol)}>
          <p className={styles.label}>{ui.labelApproach}</p>
          <div className={styles.chips}>
            {copy.brief.approachChips.map((chip) => (
              <span key={chip} className={styles.chip}>
                {chip}
              </span>
            ))}
            {copy.brief.stack?.map((chip) => (
              <span key={chip} className={cn(styles.chip, styles.chipStack)}>
                {chip}
              </span>
            ))}
          </div>
        </section>

        <div className={styles.footer}>
          <Tactile
            as={ctaHref ? "a" : "button"}
            href={ctaHref}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            onClick={onCtaClick}
            intensity="subtle"
            magnetic
            magneticMax={8}
            className={styles.cta}
          >
            {copy.ctaLabel}
            <span aria-hidden="true" className={styles.ctaArrow}>
              →
            </span>
          </Tactile>

          <Tactile
            as="button"
            intensity="subtle"
            magnetic
            magneticMax={6}
            onClick={() => setDetailsOpen((v) => !v)}
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            className={styles.detailsToggle}
          >
            {detailsOpen ? ui.detailsClose : ui.detailsOpen}
            <span aria-hidden="true">{detailsOpen ? "×" : "+"}</span>
          </Tactile>
        </div>
      </div>

      {/* Disclosure: espansione sul posto, mai un salto di layout del carosello. */}
      <div
        id={detailsId}
        className={cn(styles.details, detailsOpen && styles.detailsOpen)}
        aria-hidden={!detailsOpen}
        inert={!detailsOpen}
        data-lenis-prevent
      >
        <div className={styles.detailsScroll}>
          <div className={styles.detailsHead}>
            <p className={styles.label} style={{ flex: 1 }}>
              {ui.detailsTitle}
            </p>
            <Tactile
              as="button"
              intensity="subtle"
              magnetic
              magneticMax={6}
              onClick={() => setDetailsOpen(false)}
              className={styles.detailsToggle}
              aria-label={ui.detailsClose}
            >
              {ui.detailsClose}
              <span aria-hidden="true">×</span>
            </Tactile>
          </div>

          {detailBlocks.map((block) => (
            <div key={block.label} className={styles.block}>
              <p className={styles.label}>{block.label}</p>
              <p className={styles.detailsText}>{block.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Scurimento delle card arretrate — l'opacità la guida GSAP dal carosello. */}
      <span className={styles.scrim} data-case-scrim aria-hidden="true" />
    </Tactile>
  );
}

export default CaseCard;
