import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Contenitore orizzontale del sito. Un solo posto in cui vive la gutter.
 *
 * `width`:
 *  - "default" : 1440px — griglia piena delle sezioni
 *  - "prose"   : 62ch   — colonne di testo lungo (manifesto, about)
 *  - "narrow"  : 880px  — header di sezione centrati, form
 *  - "wide"    : 1680px — carousel e righe a scorrimento che devono respirare
 *
 * `aurora` accende L2 (ART-DIRECTION §3): due radial-gradient enormi e sfocati,
 * posizionati asimmetricamente, che danno alla sezione la sua temperatura
 * luminosa. Richiede che il contenitore sia `relative` (lo è già).
 *
 * NOTA — oggi nessuna sezione usa questa prop: tutte piazzano le proprie aurore
 * a mano. Non è una svista da "unificare": ART-DIRECTION §3 chiede che ogni
 * sezione abbia una PROPRIA temperatura luminosa (posizione, colore e opacità
 * diversi, mai centrati). Questa prop offre una sola coppia fissa e appiattirebbe
 * quella varietà. Resta come default rapido per sezioni future; sostituire con
 * essa le aurore esistenti sarebbe una regressione visiva.
 */
export function Container({
  children,
  className,
  as: Tag = "div",
  width = "default",
  aurora = false,
  id,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "header" | "footer" | "article";
  width?: "default" | "prose" | "narrow" | "wide";
  aurora?: boolean;
  id?: string;
}) {
  const maxWidth =
    width === "prose"
      ? "var(--measure-prose)"
      : width === "narrow"
        ? "880px"
        : width === "wide"
          ? "1680px"
          : "var(--container-max)";

  return (
    <Tag
      id={id}
      className={cn(
        "mx-auto w-full px-5 sm:px-8 lg:px-10",
        // `relative` solo quando serve ad ancorare le aurore: aggiungerlo sempre
        // cambierebbe il contenitore di riferimento di eventuali figli absolute
        // nelle sezioni già scritte.
        aurora && "relative",
        className,
      )}
      style={{ maxWidth }}
    >
      {aurora ? (
        <>
          <span
            aria-hidden="true"
            className="aurora"
            style={{
              top: "-18%",
              left: "-12%",
              width: "min(760px, 90vw)",
              height: "min(620px, 70vh)",
              background: "var(--aurora-abyss)",
              opacity: 0.38,
            }}
          />
          <span
            aria-hidden="true"
            className="aurora"
            style={{
              bottom: "-22%",
              right: "-8%",
              width: "min(640px, 80vw)",
              height: "min(540px, 60vh)",
              background: "var(--aurora-deep)",
              opacity: 0.3,
            }}
          />
        </>
      ) : null}
      {children}
    </Tag>
  );
}

export default Container;
