"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";
import { ensureGsapRegistered, gsap } from "@/lib/animation/gsap";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils/cn";

/**
 * ART-DIRECTION §4 — "Nessun elemento appare semplicemente."
 *
 * Reveal PER PAROLA: ogni parola sta dentro una maschera `overflow:hidden` e
 * entra da `y: 110% → 0`, stagger 0.045s, `once: true`, start `top 80%`.
 *
 * API stile <SplitText>: si avvolge QUALSIASI heading senza toccarne il markup.
 *
 *   <TextReveal as="h2" className="...">
 *     Progetto il futuro e lo <span className="serif-accent">cucio su misura</span>
 *   </TextReveal>
 *
 * Gli elementi figli (es. lo <span className="serif-accent">) vengono attraversati
 * ricorsivamente: le loro parole sono splittate e animate come tutte le altre,
 * conservando classi e stile. Elementi senza testo (<br/>, <svg/>) restano intatti.
 *
 * ── PERCHÉ LO STATO NASCOSTO È IN CSS E NON INLINE ──────────────────────────
 * Versione precedente: le parole nascevano con `style={{transform:
 * "translate3d(0,110%,0)"}}` scritto da React, e GSAP animava `yPercent
 * 110 → 0`. GSAP però NON sostituisce un transform preesistente che non sa
 * scomporre: lo tiene come base e ci APPENDE il proprio, producendo
 * `translate(0%, X%) translate3d(0px, 91.97px, 0px)`. La tween arrivava
 * regolarmente a `0%`, ma il `translate3d` di React restava incollato: ogni
 * parola atterrava esattamente dove era partita, 110% sotto la maschera.
 * Risultato: OGNI titolo del sito invisibile.
 *
 * Ora lo stato nascosto vive in `[data-tr-state="armed"] .tr-word-i` (globals.css).
 * Al mount il componente passa a `data-tr-state="live"`: la regola smette di
 * applicarsi e GSAP trova un elemento SENZA transform, quindi ne diventa
 * l'unico proprietario e `yPercent: 0` significa davvero "a posto".
 *
 * ── GARANZIA DI LEGGIBILITÀ ─────────────────────────────────────────────────
 * Il testo non dipende MAI dall'animazione per esistere:
 *  1. se il JS non gira (o GSAP esplode), l'elemento resta `armed` e una
 *     keyframe CSS di failsafe lo riporta a 0 dopo 2.4s;
 *  2. il trigger è un IntersectionObserver, non ScrollTrigger: non dipende da
 *     Lenis né da `ScrollTrigger.update()` e funziona anche con `scrollTo`
 *     programmatico e `'instant'`;
 *  3. un watchdog forza comunque il reveal se dopo 6s non è ancora partito.
 *
 * Sotto prefers-reduced-motion il testo viene renderizzato piatto e visibile,
 * senza maschere né animazione.
 */

export interface TextRevealProps {
  children: ReactNode;
  /** Tag del contenitore. Default: "span" (inline) — per i titoli passare "h1"/"h2"/"h3". */
  as?: ElementType;
  className?: string;
  /** Ritardo tra una parola e la successiva, in secondi. Default 0.045 (ART-DIRECTION §4). */
  stagger?: number;
  /** Ritardo prima dell'inizio, in secondi. */
  delay?: number;
  /** Durata di ogni parola, in secondi. */
  duration?: number;
  /**
   * Soglia di ingresso, equivalente allo `start` di ScrollTrigger.
   * "top 80%" → la tween parte quando il titolo ha superato l'80% dell'altezza
   * del viewport. Accetta la stessa sintassi ma è risolto via IntersectionObserver.
   */
  start?: string;
  /** false = rianima a ogni rientro in viewport. Default true. */
  once?: boolean;
  /** Parte subito al mount invece che allo scroll (usare nell'hero, sopra la piega). */
  immediate?: boolean;
  style?: React.CSSProperties;
}

const WORD_CLASS = "tr-word";
const INNER_CLASS = "tr-word-i";

const maskStyle: React.CSSProperties = {
  display: "inline-block",
  overflow: "hidden",
  verticalAlign: "bottom",
  // le maschere non devono tagliare discendenti (g, y, p) né accenti
  paddingBottom: "0.14em",
  marginBottom: "-0.14em",
  paddingTop: "0.06em",
  marginTop: "-0.06em",
};

/**
 * Nessun `transform` qui: lo stato nascosto è la regola CSS
 * `[data-tr-state="armed"] .tr-word-i`. Vedi il blocco di commento sopra.
 */
const innerStyle: React.CSSProperties = {
  display: "inline-block",
};

let uidSeq = 0;

/** "top 80%" → rootMargin bottom di -20%: l'elemento "entra" all'80% del viewport. */
function startToRootMargin(start: string): string {
  const m = /(-?\d+(?:\.\d+)?)\s*%/.exec(start.split(/\s+/)[1] ?? "");
  const pct = m ? Number(m[1]) : 80;
  const bottom = Math.min(Math.max(100 - pct, -50), 95);
  return `0px 0px -${bottom}% 0px`;
}

/** Spezza una stringa in parole mascherate, preservando gli spazi. */
function splitString(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // conserva gli spazi come token separati, così l'interlinea non collassa
  const tokens = text.split(/(\s+)/);
  tokens.forEach((token, i) => {
    if (token === "") return;
    if (/^\s+$/.test(token)) {
      out.push(<span key={`${keyPrefix}-s${i}`}>{token}</span>);
      return;
    }
    out.push(
      <span
        key={`${keyPrefix}-w${i}`}
        className={WORD_CLASS}
        style={maskStyle}
      >
        <span className={INNER_CLASS} style={innerStyle}>
          {token}
        </span>
      </span>,
    );
  });
  return out;
}

function splitNode(node: ReactNode, keyPrefix: string): ReactNode {
  if (typeof node === "string") return splitString(node, keyPrefix);
  if (typeof node === "number") return splitString(String(node), keyPrefix);
  if (Array.isArray(node)) {
    return node.map((child, i) => splitNode(child, `${keyPrefix}-${i}`));
  }
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = el.props?.children;
    if (inner === undefined || inner === null) return node;
    return cloneElement(el, undefined, splitNode(inner, `${keyPrefix}-c`));
  }
  return node;
}

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function TextReveal({
  children,
  as,
  className,
  stagger = 0.045,
  delay = 0,
  duration = 0.85,
  start = "top 80%",
  once = true,
  immediate = false,
  style,
}: TextRevealProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag = (as ?? "span") as any;
  const rootRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  // id stabile per le key delle parole: non deve cambiare tra i render
  const [uid] = useState(() => `tr${(uidSeq = (uidSeq + 1) % 1e6)}`);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const words = root.querySelectorAll<HTMLElement>(`.${INNER_CLASS}`);

    // reduced-motion, oppure nessuna parola da animare (contenuto già piatto):
    // si disarma e basta — il testo è nella sua posizione naturale.
    if (reduced || words.length === 0) {
      root.dataset.trState = "live";
      return;
    }

    let cleanup: (() => void) | undefined;

    try {
      ensureGsapRegistered();

      // ORDINE CRITICO: si disarma PRIMA di toccare GSAP, così `gsap.set` legge
      // un elemento senza transform e ne diventa l'unico proprietario.
      root.dataset.trState = "live";

      const ctx = gsap.context(() => {
        gsap.set(words, { yPercent: 110, willChange: "transform" });

        const tween = gsap.to(words, {
          yPercent: 0,
          duration,
          delay,
          ease: "power3.out",
          stagger,
          paused: !immediate,
          onComplete: () => gsap.set(words, { willChange: "auto" }),
        });

        if (immediate) return () => tween.kill();

        let observer: IntersectionObserver | null = null;
        // Watchdog: qualunque cosa vada storta con l'osservatore, il testo
        // compare comunque. Un titolo non può dipendere da un trigger.
        const watchdog = window.setTimeout(() => {
          if (!tween.isActive() && tween.progress() === 0) tween.play();
        }, 6000);

        if (typeof IntersectionObserver === "function") {
          observer = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) {
                  tween.play();
                  if (once) observer?.disconnect();
                } else if (!once && tween.progress() === 1) {
                  tween.pause(0);
                }
              }
            },
            { rootMargin: startToRootMargin(start), threshold: 0 },
          );
          observer.observe(root);
        } else {
          tween.play();
        }

        return () => {
          window.clearTimeout(watchdog);
          observer?.disconnect();
          tween.kill();
        };
      }, root);

      cleanup = () => {
        ctx.revert();
        // ctx.revert() riporta le parole allo stato pre-GSAP; siccome ora quello
        // stato è "nessun transform", il testo resta leggibile. Si ri-arma solo
        // se il prossimo effetto lo richiede.
      };
    } catch {
      // GSAP non disponibile: si resta `armed` e la keyframe CSS di failsafe
      // rivela il testo da sola.
      root.dataset.trState = "armed";
    }

    return cleanup;
  }, [reduced, stagger, delay, duration, start, once, immediate]);

  const content = reduced ? children : splitNode(children, uid);

  return (
    <Tag
      ref={rootRef as React.Ref<HTMLElement>}
      className={cn(className)}
      data-tr-state="armed"
      style={style}
    >
      {content}
    </Tag>
  );
}

/**
 * Alias con nome familiare: `<SplitText>` si comporta esattamente come
 * `<TextReveal>`. Esiste perché gli agenti di sezione lo cerchino con il nome
 * che già conoscono dalla libreria GSAP.
 */
export const SplitText = TextReveal;

/**
 * Reveal "a blocco" per paragrafi e card (ART-DIRECTION §4):
 * `y: 28px, opacity: 0, filter: blur(6px)` → stato pieno, 0.7s, power3.out.
 * Per i TITOLI usare TextReveal (per parola), non questo.
 *
 * Stessa garanzia: lo stato di partenza lo scrive GSAP, mai React, e se la
 * tween non parte entro 6s il watchdog la fa partire comunque.
 */
export function BlockReveal({
  children,
  as,
  className,
  delay = 0,
  start = "top 80%",
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  start?: string;
  style?: React.CSSProperties;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag = (as ?? "div") as any;
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      gsap.set(el, { opacity: 1, y: 0, filter: "none" });
      return;
    }
    ensureGsapRegistered();

    const ctx = gsap.context(() => {
      gsap.set(el, { y: 28, opacity: 0, filter: "blur(6px)" });
      const tween = gsap.to(el, {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.7,
        delay,
        ease: "power3.out",
        paused: true,
        onComplete: () => gsap.set(el, { clearProps: "filter,willChange" }),
      });

      const watchdog = window.setTimeout(() => {
        if (!tween.isActive() && tween.progress() === 0) tween.play();
      }, 6000);

      let observer: IntersectionObserver | null = null;
      if (typeof IntersectionObserver === "function") {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              tween.play();
              observer?.disconnect();
            }
          },
          { rootMargin: startToRootMargin(start), threshold: 0 },
        );
        observer.observe(el);
      } else {
        tween.play();
      }

      return () => {
        window.clearTimeout(watchdog);
        observer?.disconnect();
        tween.kill();
      };
    }, el);

    return () => ctx.revert();
  }, [reduced, delay, start]);

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}

export default TextReveal;
