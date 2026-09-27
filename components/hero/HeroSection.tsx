"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { smoothScrollTo } from "@/components/fx/scrollTo";
import { HeroContent } from "./HeroContent";
import { ScrollCue } from "./ScrollCue";
import { SceneCanvasFallback } from "./SceneCanvasFallback";
import type { SceneQuality } from "./Scene3D";
import { heroCopy, type Locale } from "@/content/hero";
import { useIsMobileVariant } from "@/components/variant/VariantProvider";
import { HeroMobile } from "./HeroMobile";
import { hasRichWebGLAsync } from "@/lib/gfx/gpu";

// Caricata solo lato client, con un fallback leggerissimo: il testo dell'hero è
// leggibile e interattivo prima che la scena esista (spec §7 "Bundle/preloader",
// ART-DIRECTION §7 "tutto il WebGL in next/dynamic({ssr:false})").
const Scene3D = dynamic(() => import("./Scene3D").then((mod) => mod.Scene3D), {
  ssr: false,
  // niente placeholder QUI: il canvas è fisso e a tutta viewport, un gradiente
  // a tutta viewport al suo posto sarebbe un lavaggio sopra mezza pagina. Il
  // posto della scena lo tiene il riquadro d'ancoraggio (vedi sotto).
  loading: () => null,
});

/** Alone aqua che occupa il posto della scena finché non è montata: mai un buco nero. */
function ScenePlaceholder() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(52% 52% at 52% 46%, rgba(63,233,204,0.13), rgba(10,47,63,0.18) 46%, transparent 72%)",
        filter: "blur(18px)",
      }}
    />
  );
}

/** Feature-detection per la qualità della scena — non solo user-agent sniffing (spec §7). */
function detectQuality(): SceneQuality {
  if (process.env.NODE_ENV !== "production") {
    // `?heroQ=full|lite|static` — solo in sviluppo, per verificare ogni livello
    const q = new URLSearchParams(window.location.search).get("heroQ");
    if (q === "full" || q === "lite" || q === "static") return q;
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory;
  const cores = navigator.hardwareConcurrency || 4;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

  if ((mem !== undefined && mem <= 2) || cores <= 2) return "static";
  if (coarsePointer || (mem !== undefined && mem <= 4) || cores <= 4) return "lite";
  return "full";
}

type Capability = { webgl: boolean; quality: SceneQuality };

/* ============================================================================
   HERO
   ----------------------------------------------------------------------------
   Composizione (ART-DIRECTION §2, §3, §6):

   · `--hero-safe-top` (= --nav-h + 4vw) sul padding superiore: il titolo non
     può più finire sotto la nav fissa. Era il bug numero uno del sito.
   · Nessun `background` sulla sezione: il fondo stratificato vive su <html> e
     lo shader L1 sta dietro tutto — dipingere qui lo coprirebbe (è così che
     l'hero era diventato "un raw html con un background color").
   · L2: due aurore enormi e sfocate, asimmetriche, una calda-aqua dietro alla
     scena e una abissale dietro al titolo.
   · Il titolo prende la sua misura piena (--measure-hero) e passa DAVANTI alla
     scena; uno scrim radiale sotto al testo tiene il contrasto AA nel punto di
     sovrapposizione (checklist spec §9).

   · v3 — la scena non è più un oggetto dentro una colonna. All'apertura i dati
     sono sparsi su TUTTA la viewport (canvas fisso, montato prima del
     contenitore e quindi sotto allo scrim) e da lì si riordinano nella rete
     neurale, che si posa dentro `sceneAnchorRef`: il riquadro, vuoto e in
     flusso, che tiene il posto alla composizione. Il canvas resta fisso anche
     dopo: sfuma con lo scroll e smette di disegnare quando l'hero esce.
   ========================================================================== */
/**
 * Variante mobile (telefoni, servita da proxy.ts): hero dedicato, leggero —
 * vedi HeroMobile.tsx. La desktop (e i tablet) restano esattamente com'erano.
 */
export function HeroSection() {
  return useIsMobileVariant() ? <HeroMobile /> : <HeroDesktop />;
}

function HeroDesktop() {
  const locale = useLocale() as Locale;
  const copy = heroCopy[locale];
  const reducedMotion = usePrefersReducedMotion();
  const [capability, setCapability] = useState<Capability | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  // Il riquadro (vuoto, in flusso) dove la rete si posa a fine animazione: è
  // l'unico legame fra il canvas — che è FISSO e copre tutta la viewport, per
  // poter spargere i dati su tutta la pagina — e la composizione dell'hero.
  const sceneAnchorRef = useRef<HTMLDivElement>(null);
  // La colonna di testo: le strutture di dati dell'apertura la misurano per
  // non finirle MAI sopra (contrasto AA prima dell'effetto).
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // fuori dal commit sincrono: la detection non deve incatenare un secondo
    // render prima del primo paint — il testo dell'hero viene prima della scena.
    let alive = true;
    const id = requestAnimationFrame(() => {
      hasRichWebGLAsync().then((webgl) => {
        if (alive) setCapability({ webgl, quality: detectQuality() });
      });
    });
    return () => {
      alive = false;
      cancelAnimationFrame(id);
    };
  }, []);

  // Lenis guida lo scroll: gli scroll programmatici passano da smoothScrollTo,
  // mai da window.scrollTo / scrollIntoView (che gli combatterebbero contro).
  const goToSection = useCallback((id: string) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(id);
    if (!el) return;
    smoothScrollTo(el, -72); // -(--nav-h): la sezione non finisce sotto la nav
  }, []);

  const goToNext = useCallback(() => {
    const el = sectionRef.current;
    const top = el ? el.offsetTop + el.offsetHeight : window.innerHeight;
    smoothScrollTo(top - 72);
  }, []);

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative isolate flex w-full flex-col justify-center overflow-hidden"
      style={{
        minHeight: "100svh",
        paddingTop: "var(--hero-safe-top)",
        paddingBottom: "clamp(7rem, 14vh, 11rem)",
      }}
    >
      {/* --- L2: aurore di sezione, mai centrate --- */}
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "-14%",
          left: "-16%",
          width: "min(900px, 108vw)",
          height: "min(720px, 82vh)",
          background: "var(--aurora-abyss)",
          opacity: 0.42,
        }}
      />
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "6%",
          right: "-10%",
          width: "min(820px, 96vw)",
          height: "min(760px, 88vh)",
          background: "var(--aurora-aqua)",
          opacity: 0.5,
        }}
      />
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          bottom: "-24%",
          left: "28%",
          width: "min(700px, 88vw)",
          height: "min(480px, 52vh)",
          background: "var(--aurora-deep)",
          opacity: 0.32,
        }}
      />

      {/* --- LA SCENA (WebGL) ------------------------------------------------
          Canvas FISSO a tutta viewport, montato PRIMA del contenitore: così
          all'apertura i dati possono essere sparsi su tutta la pagina, e nella
          pittura resta comunque sotto allo scrim che protegge il contrasto del
          titolo. Dove la rete si va a posare lo decide `sceneAnchorRef`, il
          riquadro che la composizione le ha sempre riservato (45% a destra da
          lg, tutto il blocco sotto).
          Su viewport piccole la scena passa dietro al testo: lì si abbassa,
          come prima, perché il contrasto AA viene prima dell'effetto. ------ */}
      {capability?.webgl && (
        // Niente più opacità ridotta sul wrapper sotto lg: spegneva anche
        // l'esplosione. Ora è lo shader ad abbassare la sola RETE quando sta
        // dietro al testo (uGraphDim), mentre l'apertura resta piena.
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
          <Scene3D
            reducedMotion={reducedMotion}
            quality={capability.quality}
            anchorRef={sceneAnchorRef}
            contentRef={contentRef}
            locale={locale}
          />
        </div>
      )}

      <div className="relative mx-auto w-full max-w-[var(--container-max)] px-5 sm:px-8 lg:px-10">
        {/* --- il riquadro d'arrivo della rete: sfondo dietro al testo sotto
                lg, oggetto a destra da lg. Vuoto quando c'è WebGL (è solo una
                misura); ospita il fallback 2D quando WebGL non c'è. --- */}
        <div
          ref={sceneAnchorRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.42] sm:opacity-[0.6] lg:left-auto lg:right-[-3%] lg:top-1/2 lg:h-[min(88vh,860px)] lg:w-[46%] lg:-translate-y-1/2 lg:opacity-100"
        >
          {capability === null ? (
            <ScenePlaceholder />
          ) : capability.webgl ? null : (
            <SceneCanvasFallback reducedMotion={reducedMotion} locale={locale} />
          )}
          {/* Didascalia: cosa rappresenta la forma della rete. Solo da lg,
              dove il grafo è un oggetto a sé e non uno sfondo dietro al testo. */}
          <p
            className="hero-pillars-caption absolute top-[calc(100%+0.35rem)] right-[9%] hidden text-right lg:block"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.66rem",
              lineHeight: 1.6,
              letterSpacing: "0.08em",
              color: "var(--text-low)",
              // compare a rete formata (~5s), mai durante l'esplosione
              animation: reducedMotion ? undefined : "hero-caption-in 1.2s ease-out 5.2s both",
            }}
          >
            <style>{`@keyframes hero-caption-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
            <span className="whitespace-nowrap text-[var(--text-mid)]">{copy.pillarsCaption}</span>
            <span className="whitespace-nowrap opacity-80"> · {copy.pillarsCredit}</span>
          </p>
        </div>

        {/* --- scrim: tiene il contrasto del testo dove passa sopra la scena --- */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-[-12%] left-[-12%] z-[1] w-[86%]"
          style={{
            background:
              "radial-gradient(58% 54% at 34% 50%, rgba(3,7,10,0.82), rgba(3,7,10,0.5) 52%, rgba(3,7,10,0) 78%)",
          }}
        />

        <div ref={contentRef} className="relative z-10 w-full lg:max-w-[78%]">
          <HeroContent
            locale={locale}
            onCtaPrimaryClick={() => goToSection("progetti")}
            onCtaSecondaryClick={() => goToSection("contatti")}
          />
        </div>
      </div>

      {/* --- invito a scorrere, ancorato al fondo della sezione --- */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[clamp(1.75rem,4vh,3rem)] z-10 flex justify-center">
        <div className="pointer-events-auto">
          <ScrollCue
            label={copy.scrollHint}
            ariaLabel={copy.scrollHintAria}
            reducedMotion={reducedMotion}
            onActivate={goToNext}
          />
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
