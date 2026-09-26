"use client";

import { useEffect, type RefObject } from "react";
import { gsap, ScrollTrigger, ensureGsapRegistered } from "@/lib/animation/gsap";

/* ============================================================================
   LA SCIA — motore dell'effetto chiesto dal proprietario
   ----------------------------------------------------------------------------
   > "vorrei far partire dalla scritta principale un glow che attraversa questa
   >  riga illuminando tappa per tappa e ingrandendo la scritta quando la scia
   >  luminosa la raggiunge (effetto di circa 1 secondo)"

   Quattro battute, un secondo netto dalla carica all'arrivo:

     0.00 → 0.16  CARICA   il titolo si illumina (è la sorgente della luce)
     0.06 → 0.20  SCINTILLA una linea scende dal titolo all'inizio della guida
     0.16 → 1.00  VIAGGIO  la testa luminosa percorre la guida; dietro di sé
                           lascia una coda che decade e la guida resta accesa
     ad ogni       IGNIZIONE quando la testa raggiunge una tappa, la tappa si
     passaggio               accende e il nome si INGRANDISCE (0.16s su, 0.44s
                             di ritorno elastico) per poi assestarsi a scala 1

   Il progresso vive in DUE custom property scritte sul contenitore:
     --trail-p    0→1, frazione percorsa  → scaleX/scaleY del tratto acceso
     --trail-len  px percorsi             → translate della testa e della coda
   Nessun tween tocca layout: solo transform, opacity e clip di scala. Il nome
   si ingrandisce con `transform: scale`, quindi non sposta di un pixel ciò che
   ha intorno (vincolo esplicito: nessun layout shift dietro l'ingrandimento).

   L'orientamento (riga su desktop, colonna sotto 1024px) cambia solo QUALE
   coordinata si misura: il resto della meccanica è identico.
   ========================================================================== */

export const TRAIL = {
  /** Carica del titolo prima della partenza (s). */
  charge: 0.16,
  /** Percorrenza della riga (s). charge + travel = 1.00s esatti. */
  travel: 0.84,
  /** Ingrandimento del nome all'ignizione. */
  labelScale: 1.12,
  /** Salita dell'ingrandimento (s). */
  igniteUp: 0.16,
  /** Ritorno elastico a scala 1 (s). */
  igniteBack: 0.44,
} as const;

/** Distanza del nodo di una tappa dal bordo della sua li, per asse. */
const NODE_OFFSET_X = 0; // orizzontale: il nodo è sul bordo sinistro della tappa
const NODE_OFFSET_Y = 10; // verticale: il nodo è all'altezza della prima riga di testo

const VERTICAL_QUERY = "(max-width: 1023px)";

export type LightTrailRefs = {
  /** Sezione: è il trigger dello ScrollTrigger. */
  rootRef: RefObject<HTMLElement | null>;
  /** Contenitore guida + tappe: porta le custom property del progresso. */
  wrapRef: RefObject<HTMLDivElement | null>;
  /** Titolo della sezione: la sorgente da cui parte il glow. */
  headingRef: RefObject<HTMLElement | null>;
};

/**
 * Monta la timeline della scia su uno ScrollTrigger one-shot.
 *
 * `reduced === true` → nessuna timeline: ogni tappa viene messa subito nello
 * stato finale acceso e la guida risulta illuminata per intero (ART-DIRECTION §7:
 * versione statica ma COMPLETA e leggibile).
 */
export function useLightTrail(
  { rootRef, wrapRef, headingRef }: LightTrailRefs,
  reduced: boolean,
) {
  useEffect(() => {
    const root = rootRef.current;
    const wrap = wrapRef.current;
    if (!root || !wrap) return;

    const stops = Array.from(
      root.querySelectorAll<HTMLElement>("[data-stop]"),
    );

    /* ---- reduced motion: stato finale, subito, senza una sola animazione ---- */
    if (reduced) {
      stops.forEach((stop) => {
        stop.dataset.lit = "true";
      });
      wrap.style.setProperty("--trail-p", "1");
      wrap.style.setProperty("--trail-len", "100%");
      wrap.dataset.trail = "done";
      const heading = headingRef.current;
      if (heading) heading.dataset.charged = "true";
      return;
    }

    ensureGsapRegistered();

    const ctx = gsap.context(() => {
      const heading = headingRef.current;
      const spark = wrap.querySelector<HTMLElement>("[data-spark]");
      /* `[data-head]` è il CORE della testa, non il suo wrapper: il wrapper
         porta il translate guidato da --trail-len e non deve essere toccato da
         GSAP (scriverebbe una transform inline e la scia si fermerebbe). */
      const head = wrap.querySelector<HTMLElement>("[data-head]");
      const tail = wrap.querySelector<HTMLElement>("[data-tail]");
      /* L'alone della sorgente sta nell'header, fuori da `wrap`. */
      const bloom = root.querySelector<HTMLElement>("[data-bloom]");

      let vertical = false;
      let length = 1;
      let thresholds: number[] = [];
      const ignited = stops.map(() => false);

      const measure = () => {
        vertical = window.matchMedia(VERTICAL_QUERY).matches;
        length = Math.max(
          1,
          vertical ? wrap.clientHeight : wrap.clientWidth,
        );
        thresholds = stops.map((stop) =>
          vertical
            ? stop.offsetTop + NODE_OFFSET_Y
            : stop.offsetLeft + NODE_OFFSET_X,
        );
      };

      const writeProgress = (p: number) => {
        wrap.style.setProperty("--trail-p", String(p));
        wrap.style.setProperty("--trail-len", `${p * length}px`);
      };

      /** La tappa si accende e il suo nome si ingrandisce. */
      const ignite = (stop: HTMLElement) => {
        stop.dataset.lit = "true";

        const label = stop.querySelector<HTMLElement>("[data-label]");
        if (label) {
          gsap.set(label, { willChange: "transform" });
          gsap.to(label, {
            keyframes: [
              {
                scale: TRAIL.labelScale,
                duration: TRAIL.igniteUp,
                ease: "power2.out",
              },
              {
                scale: 1,
                duration: TRAIL.igniteBack,
                ease: "elastic.out(1, 0.62)",
              },
            ],
            onComplete: () =>
              gsap.set(label, { clearProps: "transform,willChange" }),
          });
        }

        const node = stop.querySelector<HTMLElement>("[data-node]");
        if (node) {
          gsap.to(node, {
            keyframes: [
              { scale: 2.05, duration: 0.14, ease: "power2.out" },
              { scale: 1, duration: 0.42, ease: "back.out(2.4)" },
            ],
          });
        }
      };

      /** Accende tutto ciò che la testa ha oltrepassato. */
      const sweep = (x: number) => {
        for (let i = 0; i < stops.length; i += 1) {
          if (!ignited[i] && thresholds[i] <= x) {
            ignited[i] = true;
            ignite(stops[i]);
          }
        }
      };

      const run = () => {
        measure();
        writeProgress(0);
        wrap.dataset.trail = "running";

        const progress = { p: 0 };
        const tl = gsap.timeline({
          onComplete: () => {
            // rete di sicurezza: se una soglia fosse caduta oltre la lunghezza
            // misurata (font caricati tardi, resize a metà), nessuna tappa resta
            // spenta — lo stato finale è sempre "tutto acceso".
            sweep(Number.POSITIVE_INFINITY);
            wrap.dataset.trail = "done";
          },
        });

        // 1 — CARICA: il titolo diventa la sorgente
        if (heading) {
          tl.call(
            () => {
              heading.dataset.charged = "true";
            },
            undefined,
            0,
          );
        }
        if (bloom) {
          tl.fromTo(
            bloom,
            { opacity: 0, scale: 0.7 },
            { opacity: 1, scale: 1, duration: TRAIL.charge, ease: "power2.out" },
            0,
          ).to(
            bloom,
            { opacity: 0.38, duration: 0.7, ease: "power2.out" },
            TRAIL.charge,
          );
        }

        // 2 — SCINTILLA: la luce scende dal titolo alla guida
        if (spark) {
          tl.fromTo(
            spark,
            { scaleY: 0, opacity: 1 },
            { scaleY: 1, duration: 0.14, ease: "power2.in" },
            0.05,
          ).to(spark, { opacity: 0, duration: 0.55, ease: "power2.out" }, 0.3);
        }

        // 3 — VIAGGIO: testa + coda percorrono la guida, accendendo tappa per tappa
        const lamps = [head, tail].filter(Boolean) as HTMLElement[];
        if (lamps.length) {
          tl.fromTo(
            lamps,
            { opacity: 0 },
            { opacity: 1, duration: 0.12, ease: "power1.out" },
            TRAIL.charge - 0.04,
          );
        }

        tl.to(
          progress,
          {
            p: 1,
            duration: TRAIL.travel,
            ease: "power1.inOut",
            onUpdate: () => {
              writeProgress(progress.p);
              sweep(progress.p * length);
            },
          },
          TRAIL.charge,
        );

        // 4 — USCITA: la testa si spegne, la guida resta accesa
        const exitAt = TRAIL.charge + TRAIL.travel - 0.08;
        if (head) {
          tl.to(
            head,
            { opacity: 0, scale: 0.5, duration: 0.34, ease: "power2.out" },
            exitAt,
          );
        }
        if (tail) {
          tl.to(tail, { opacity: 0, duration: 0.34, ease: "power2.out" }, exitAt);
        }
      };

      /* Una sola esecuzione, ma agganciata a ENTRAMBI i versi di attraversamento:
         chi ricarica la pagina già sotto la sezione e poi risale la vedrebbe
         altrimenti spenta per sempre (`onEnter` non scatta risalendo). Il flag
         garantisce che la scia parta una volta e una sola — niente effetto
         "slot machine" scrollando su e giù. */
      let started = false;
      const runOnce = () => {
        if (started) return;
        started = true;
        run();
      };

      ScrollTrigger.create({
        trigger: root,
        start: "top 80%",
        end: "bottom top",
        onEnter: runOnce,
        onEnterBack: runOnce,
      });
    }, root);

    return () => ctx.revert();
  }, [rootRef, wrapRef, headingRef, reduced]);
}
