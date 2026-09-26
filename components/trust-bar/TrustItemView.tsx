"use client";

import { Tactile } from "@/components/ui/Tactile";
import { cn } from "@/lib/utils/cn";
import { trustItemName, type Locale, type TrustItem } from "@/content/trust-bar";
import styles from "./TrustBar.module.css";

export type TrustItemViewProps = {
  item: TrustItem;
  locale: Locale;
  reducedMotion: boolean;
  /** Label di gruppo (solo a11y/tooltip), vedi spec §1 e §7 contratti. */
  groupLabel: string;
  /** Posizione nella linea temporale (1-based), DERIVATA dai dati, mai scritta a mano. */
  position: number;
  className?: string;
};

/**
 * Contenuto di una tappa. La guardia sui loghi non autorizzati è invariata
 * rispetto alla v1 ed è il motivo per cui `status` esiste separato da `logoUrl`:
 *   (status === "verified" && logoUrl) -> <img>, altrimenti wordmark testuale.
 *
 * `data-label` è il bersaglio dell'ingrandimento all'ignizione (useLightTrail):
 * un solo nodo, con `transform-origin: left` in CSS, così la scala non sposta
 * nulla intorno a sé.
 *
 * Interattività: se esiste `externalUrl` l'intera tappa è un link — e allora
 * NIENTE wobble (ART-DIRECTION §5.1: `Tactile` lo deriva da sé dal tag `a`,
 * nessun call site lo dichiara). Senza link resta un elemento decorativo, che
 * molleggia: un elemento che al passaggio del mouse non fa nulla è un bug.
 */
export function TrustItemView({
  item,
  locale,
  reducedMotion,
  groupLabel,
  position,
  className,
}: TrustItemViewProps) {
  const name = trustItemName(item, locale);
  const showImage = item.status === "verified" && Boolean(item.logoUrl);
  const hasLink = Boolean(item.externalUrl);

  const body = showImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.logoUrl}
      alt={item.logoAlt ?? name}
      data-label
      className={styles.logoImg}
      title={groupLabel}
      loading="lazy"
    />
  ) : (
    <span data-label className={styles.label} title={groupLabel}>
      {name}
    </span>
  );

  const content = (
    <>
      <span className={styles.index} aria-hidden="true">
        {String(position).padStart(2, "0")}
      </span>
      {body}
    </>
  );

  const sharedClassName = cn(
    styles.stopInner,
    hasLink ? styles.clickable : styles.static,
    className,
  );

  if (hasLink) {
    return (
      <Tactile
        as="a"
        href={item.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        intensity="subtle"
        magnetic={!reducedMotion}
        magneticMax={8}
        className={sharedClassName}
        aria-label={`${name} — ${groupLabel}`}
      >
        {content}
      </Tactile>
    );
  }

  return (
    <Tactile as="div" intensity="subtle" className={sharedClassName}>
      {content}
      {/* Su un <div> l'aria-label non viene esposto: la categoria va data come
          testo, nascosto solo alla vista. */}
      <span className="sr-only">{groupLabel}</span>
    </Tactile>
  );
}
