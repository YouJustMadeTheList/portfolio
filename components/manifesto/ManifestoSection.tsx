"use client";

import { useRef } from "react";
import { useLocale } from "next-intl";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { manifestoCopy, type ManifestoLocale } from "@/content/manifesto";
import { ManifestoLine } from "./ManifestoLine";
import { DataButterflies } from "./DataButterflies";

// 03 MANIFESTO — sezione-cuscinetto tra Trust Bar e Case Studies. Quasi solo
// tipografia, più la faglia d'aurora con le farfalle di numeri (richiesta del
// cliente, DataButterflies). Reveal parola-per-parola con "aha" cromatico sulla
// keyword — vedi specs/03-manifesto.md.
export function ManifestoSection() {
  const locale = useLocale() as ManifestoLocale;
  const reducedMotion = usePrefersReducedMotion();
  const copy = manifestoCopy[locale] ?? manifestoCopy.it;
  const textRef = useRef<HTMLDivElement | null>(null);

  return (
    <section id="manifesto" className="section-padding manifesto-section relative overflow-x-clip">
      {/* L2 — un'unica aurora, molto sommessa: la sezione resta "silenzio
          tipografico" (spec §4), ma nessuna superficie è nero piatto
          (ART-DIRECTION §3/§8). Asimmetrica e a bassa opacità apposta. */}
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "-6%",
          left: "-10%",
          width: "min(680px, 84vw)",
          height: "min(520px, 54vh)",
          background: "var(--aurora-deep)",
          opacity: 0.22,
        }}
      />

      {/* La faglia d'aurora da cui trasudano i numeri che si fondono in
          farfalle e volano via oltre i bordi della pagina. Canvas a tutta
          larghezza della sezione (e oltre, sopra/sotto, sfumato): copre l'aria
          vuota intorno alla frase; la colonna di testo è misurata dal vivo e
          dentro di essa tutto si attenua (contrasto AA). Pausa fuori viewport;
          sotto reduced-motion un solo fotogramma composto. */}
      <DataButterflies reducedMotion={reducedMotion} avoidRef={textRef} />

      <div className="relative z-10 mx-auto w-full max-w-[1440px]">
        <div className="max-w-[900px] px-6 sm:max-w-[85%] sm:px-8 lg:max-w-[900px] lg:px-0 lg:pl-[8vw]">
          <div ref={textRef}>
            <ManifestoLine
              tokens={copy.line}
              pillars={copy.pillars}
              coda={copy.coda}
              secondary={copy.secondary}
              reducedMotion={reducedMotion}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
