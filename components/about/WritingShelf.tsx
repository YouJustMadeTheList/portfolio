"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import { BlockReveal } from "@/components/fx/TextReveal";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { writingCopy } from "./writingCopy";
import { writingCards, type WritingCard } from "@/content/about";

/* ============================================================================
   Sotto-sezione "Scritti" — libreria 3D
   ----------------------------------------------------------------------------
   Nota del cliente: «quei box vanno trasformati in un modello 3d di libreria,
   dove ogni libro è un articolo (il nome compare con un pop up cliccando sopra
   al libro), cliccando poi sulla scritta scopri, rimanda interamente
   all'articolo».

   PERCHÉ CSS 3D E NON WEBGL — scelta deliberata, non una scorciatoia:

   1. Il titolo sul dorso deve essere TESTO VERO. In CSS è un normale nodo di
      testo ruotato con `writing-mode`: gli screen reader lo leggono, si
      seleziona, si cerca con Ctrl+F, e si ridisegna nitido a ogni DPR. In WebGL
      sarebbe geometria o un atlante di glifi — invisibile all'albero di
      accessibilità, e avrebbe richiesto un font 3D che non possiamo installare.
   2. Budget di performance (ART-DIRECTION §7). La pagina ha già DUE sistemi
      pesanti: il campo particellare globale di fondo e quello dell'hero. Un
      terzo contesto WebGL per un oggetto da due libri è sproporzionato; qui
      tutto vive su `transform`, quindi è composito puro sulla GPU e non costa
      un frame.
   3. Nessuna dipendenza da installare (vincolo esplicito del brief).

   L'unica cosa che WebGL darebbe in più — riflessi e ombre reali — la si
   approssima molto bene con gradienti e glow, che è poi il linguaggio
   "aqua su vuoto" di tutto il sito: un oggetto ILLUMINATO in una stanza buia.

   INTERAZIONE (ART-DIRECTION §5.1) — riscritta dopo la nota del cliente
   «tremano decisamente troppo ed in maniera innaturale quando li clicchi».
   Le cause del tremolio erano cinque, e ognuna è stata tolta alla radice:

   1. Bersaglio che si muove sotto il cursore. L'hover spostava in avanti il
      BOTTONE stesso: sotto prospettiva la sua proiezione cambiava, sul bordo il
      cursore ne usciva, l'hover cadeva, il libro tornava indietro, rientrava…
      un loop avanti/indietro. Ora il bottone e un `.book-hit` trasparente sono
      FERMI; si muove solo `.book-body` (pointer-events: none), quindi lo stato
      di hover non dipende più dalla posizione del libro.
   2. `filter` su un elemento `preserve-3d`: il filtro appiattisce il contesto
      3D, quindi a ogni hover/press la scatola "saltava" fra 3D e piatto. La
      luce ora è l'opacità di un velo sul dorso, fuori dal contesto 3D.
   3. Tilt dello scaffale via transition CSS riavviata a OGNI pointermove (una
      power3.out da 420ms ripartita decine di volte al secondo = scatti). Ora è
      un inseguimento esponenziale in rAF, lento (τ≈520ms) e di ampiezza bassa
      (±4°/±1.8°), CONGELATO mentre si preme o la scheda è aperta.
   4. Apertura della scheda: l'overlay copriva lo stage, scattava
      `pointerleave` e il tilt tornava a zero proprio mentre la scheda entrava.
      Il cursore ora si legge da `window` rispetto al rettangolo (non
      trasformato) della scena, e con la scheda aperta il tilt resta fermo.
   5. Il CTA in `Tactile` (magnetico + squash a keyframe) sobbalzava sotto il
      dito al click. Ora è un link semplice: solo luce e una freccia ↗ che
      scorre di 2px.

   Il vocabolario resta A′: il libro viene "sfilato" di qualche px, avanti e in
   su, come tirato da un dito; alla pressione si assesta morbido; al click esce
   di più mentre la scheda compare. Nessuna rotazione animata, nessun rimbalzo,
   una sola transizione per proprietà.
   ========================================================================== */

type Locale = "it" | "en";

const copy = writingCopy;

/* ------------------------------------------------------------------ misure -- */

/**
 * Hash stabile (FNV-1a) sull'id dell'articolo.
 *
 * Le proporzioni di ogni libro (spessore, altezza, tono) sono derivate da QUI e
 * non dall'indice nell'array: aggiungere un articolo in mezzo non ridisegna i
 * libri già presenti, e lo stesso articolo ha sempre lo stesso aspetto fra un
 * deploy e l'altro. È ciò che tiene lo scaffale "voluto" a due libri e ancora
 * coerente a dieci.
 */
function hash01(s: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

type BookShape = { thickness: number; height: number; tone: number; lean: number };

function bookShape(card: WritingCard): BookShape {
  return {
    // spessore del dorso: 34–52px. Sotto i 34 il titolo verticale diventa
    // illeggibile, sopra i 52 il libro sembra un mattone.
    thickness: Math.round(34 + hash01(card.id, 1) * 18),
    // altezza: 172–214px. La variazione è ciò che dà ritmo a una fila corta.
    height: Math.round(172 + hash01(card.id, 2) * 42),
    // posizione sulla rampa di tono aqua (vedi --shelf-far/--shelf-near).
    tone: hash01(card.id, 3),
    // micro-inclinazione statica: un libro appoggiato non è mai perfettamente
    // a piombo. ±1.2°, sempre lo stesso per lo stesso articolo.
    lean: (hash01(card.id, 4) - 0.5) * 2.4,
  };
}

/* ------------------------------------------------------------------- modale -- */

const FOCUSABLE =
  'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"]),input,select,textarea';

function BookDialog({
  card,
  locale,
  onClose,
  reduced,
}: {
  card: WritingCard;
  locale: Locale;
  onClose: () => void;
  reduced: boolean;
}) {
  const t = copy[locale];
  const panelRef = useRef<HTMLDivElement>(null);
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const titleId = `sh-t-${rawId}`;
  const descId = `sh-d-${rawId}`;
  const note = card.languageNote?.[locale];
  const live = card.published === true;
  // URL assoluto ⇒ link esterno: nuova scheda, nessun prefisso di lingua (il
  // valore di `href` è usato tale e quale, mai passato al Link di next-intl).
  const external = /^https?:\/\//i.test(card.href);
  const foreign = card.lang != null && card.lang !== locale;

  /* Focus iniziale sul PANNELLO, non sul primo bottone: così uno screen reader
     annuncia nome e descrizione della finestra (aria-labelledby/-describedby),
     cioè titolo e sommario dell'articolo, prima di leggere i controlli. Il Tab
     successivo entra normalmente nei comandi. */
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  /* Escape + trappola del focus. `capture: true` per arrivare prima di
     eventuali handler globali (es. la chiusura dei tooltip dell'elica). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0,
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active != null && panel.contains(active);
      // Shift+Tab mentre il focus è sul pannello stesso uscirebbe dalla finestra
      // (il pannello non è nella lista, quindi non è `firstEl`): va riportato
      // esplicitamente sull'ultimo comando.
      if (e.shiftKey && (!inside || active === panel || active === firstEl)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (!inside || active === lastEl)) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div
      className="shelf-overlay"
      data-reduced={reduced ? "true" : undefined}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="shelf-dialog"
      >
        <button type="button" className="shelf-x" onClick={onClose} aria-label={t.close}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        <p className="shelf-dialog-eyebrow">{copy[locale].heading}</p>
        <h3 id={titleId} className="shelf-dialog-title">
          {card.title[locale]}
        </h3>
        <p id={descId} className="shelf-dialog-desc">
          {card.description[locale]}
        </p>

        <div className="shelf-dialog-foot">
          {live ? (
            <a
              href={card.href}
              className="shelf-cta"
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : null)}
              {...(card.lang ? { hrefLang: card.lang } : null)}
            >
              {t.discover}
              {foreign ? (
                <span className="shelf-cta-tag">({card.lang!.toUpperCase()})</span>
              ) : null}
              <span aria-hidden="true" className="shelf-cta-arrow">
                {external ? "↗" : "→"}
              </span>
              {external ? <span className="sr-only-shelf">{t.newTab}</span> : null}
            </a>
          ) : (
            /* Destinazione non ancora esistente: il controllo resta visibile e
               descritto, ma NON naviga (niente 404 silenziosi). */
            <span className="shelf-cta shelf-cta--off" aria-disabled="true">
              {t.discover}
              <span className="shelf-cta-tag">{t.pending}</span>
            </span>
          )}
          {note ? <span className="shelf-dialog-note">{note}</span> : null}
        </div>
        {!live ? <p className="shelf-dialog-pending">{t.pendingDetail}</p> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- componente -- */

export function WritingShelf() {
  const locale = useLocale() as Locale;
  const t = copy[locale];
  const reduced = usePrefersReducedMotion();

  const [openId, setOpenId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  /* Il tilt si ferma mentre un libro è premuto o aperto: un oggetto che hai in
     mano non deve scivolarti sotto il dito. Ref, non stato: nessun re-render. */
  const frozenRef = useRef(false);
  const pressedRef = useRef(false);
  const retargetRef = useRef<() => void>(() => {});

  // eslint-disable-next-line react-hooks/set-state-in-effect -- flag di mount per il portal
  useEffect(() => setMounted(true), []);

  const openCard = writingCards.find((c) => c.id === openId) ?? null;

  useEffect(() => {
    frozenRef.current = openId != null || pressedRef.current;
    if (openId == null) retargetRef.current();
  }, [openId]);

  /* Chiudendo, il focus torna al libro che ha aperto la scheda. */
  const close = useCallback(() => {
    const id = openId;
    setOpenId(null);
    if (id) {
      requestAnimationFrame(() => triggerRefs.current.get(id)?.focus({ preventScroll: true }));
    }
  }, [openId]);

  /* Tilt dell'insieme agganciato al cursore (comportamento C), CALMO:
     - il cursore si legge su `window` rispetto al rettangolo della SCENA, che
       non è trasformata: nessun anello di retroazione tilt → rect → tilt, e
       nessuna dipendenza da `pointerleave` (che scattava all'apertura della
       scheda, quando l'overlay copre lo stage);
     - l'angolo insegue il bersaglio con un filtro esponenziale indipendente dal
       frame rate — nessuna transition CSS riavviata a ogni evento;
     - il loop rAF gira solo finché c'è distanza da coprire. */
  useEffect(() => {
    const stage = stageRef.current;
    const scene = sceneRef.current;
    if (!stage || !scene || reduced) return;

    const AMP_Y = 4; // gradi, destra/sinistra
    const AMP_X = 1.8; // gradi, alto/basso
    const TAU = 520; // ms: costante di tempo dell'inseguimento

    let raf = 0;
    let last = 0;
    let cx = 0; // angoli correnti
    let cy = 0;
    let gx = 0; // bersaglio
    let gy = 0;
    let px = -1; // ultima posizione nota del puntatore
    let py = -1;

    const step = (now: number) => {
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      const k = 1 - Math.exp(-dt / TAU);
      cx += (gx - cx) * k;
      cy += (gy - cy) * k;
      const done = Math.abs(gx - cx) < 0.005 && Math.abs(gy - cy) < 0.005;
      if (done) {
        cx = gx;
        cy = gy;
      }
      stage.style.setProperty("--tilt-y", `${cx.toFixed(3)}deg`);
      stage.style.setProperty("--tilt-x", `${cy.toFixed(3)}deg`);
      if (done) {
        raf = 0;
        last = 0;
      } else raf = requestAnimationFrame(step);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const retarget = () => {
      if (frozenRef.current) return;
      const r = scene.getBoundingClientRect();
      const inside = px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
      if (inside) {
        const nx = (px - r.left) / Math.max(r.width, 1) - 0.5;
        const ny = (py - r.top) / Math.max(r.height, 1) - 0.5;
        // `gy` NON è negato: la base è rotateX(-7deg) e il cursore che sale
        // deve far guardare un po' più dall'alto dentro lo scaffale.
        gx = nx * 2 * AMP_Y;
        gy = ny * 2 * AMP_X;
      } else {
        gx = 0;
        gy = 0;
      }
      kick();
    };
    retargetRef.current = retarget;

    let pending = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      px = e.clientX;
      py = e.clientY;
      if (!pending)
        pending = requestAnimationFrame(() => {
          pending = 0;
          retarget();
        });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
      if (pending) cancelAnimationFrame(pending);
      retargetRef.current = () => {};
    };
  }, [reduced]);

  /* Pressione: congela il tilt finché il dito è giù, poi lo rilascia. */
  useEffect(() => {
    const release = () => {
      if (!pressedRef.current) return;
      pressedRef.current = false;
      frozenRef.current = openId != null;
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [openId]);

  const tallest = writingCards.reduce((mx, c) => Math.max(mx, bookShape(c).height), 0);

  return (
    <div className="shelf-root">
      <style dangerouslySetInnerHTML={{ __html: SHELF_CSS }} />

      <p className="eyebrow">{t.heading}</p>
      <p className="shelf-hint">{t.hint}</p>

      <BlockReveal className="shelf-reveal">
        <div ref={sceneRef} className="shelf-scene" data-reduced={reduced ? "true" : undefined}>
          <span aria-hidden="true" className="shelf-aurora" />

          <div ref={stageRef} className="shelf-stage">
            <div
              className="shelf-books"
              style={{ ["--tallest" as string]: `${tallest}px` }}
            >
              <span aria-hidden="true" className="shelf-end shelf-end--l" />

              {writingCards.map((card) => {
                const s = bookShape(card);
                const live = card.published === true;
                const isOpen = openId === card.id;
                return (
                  <button
                    key={card.id}
                    ref={(el) => {
                      triggerRefs.current.set(card.id, el);
                    }}
                    type="button"
                    className="book"
                    data-open={isOpen ? "true" : undefined}
                    aria-haspopup="dialog"
                    aria-expanded={isOpen}
                    onPointerDown={() => {
                      pressedRef.current = true;
                      frozenRef.current = true;
                    }}
                    onClick={() => setOpenId(card.id)}
                    style={{
                      ["--bw" as string]: `${s.thickness}px`,
                      ["--bh" as string]: `${s.height}px`,
                      ["--lean" as string]: `${s.lean}deg`,
                      ["--tone" as string]: `${(s.tone * 100).toFixed(1)}%`,
                    }}
                  >
                    {/* Superficie di click FERMA, sul piano dei dorsi: l'hover
                        non dipende mai da dove si trova il libro in movimento. */}
                    <span aria-hidden="true" className="book-hit" />
                    {/* Il corpo è l'unica cosa che si muove. */}
                    <span className="book-body">
                      {/* dorso — la faccia rivolta a chi guarda */}
                      <span className="book-face book-spine">
                        <span aria-hidden="true" className="book-band book-band--t" />
                        {/* Testo VERO: troncato otticamente da `text-overflow`,
                            ma nel DOM il titolo è completo, quindi uno screen
                            reader lo legge per intero. */}
                        <span className="book-title">{card.title[locale]}</span>
                        <span aria-hidden="true" className="book-band book-band--b" />
                        {!live ? <span aria-hidden="true" className="book-pin" /> : null}
                        <span aria-hidden="true" className="book-light" />
                      </span>
                      {/* copertina (destra) e taglio superiore delle pagine */}
                      <span aria-hidden="true" className="book-face book-cover" />
                      <span aria-hidden="true" className="book-face book-top" />
                    </span>
                  </button>
                );
              })}

              <span aria-hidden="true" className="shelf-end shelf-end--r" />
            </div>

            {/* ripiano: faccia frontale + piano d'appoggio */}
            <div aria-hidden="true" className="shelf-plank">
              <span className="shelf-plank-front" />
              <span className="shelf-plank-top" />
            </div>
          </div>
        </div>
      </BlockReveal>

      {mounted && openCard
        ? createPortal(
            /* In portale su <body> di proposito: un overlay `position: fixed`
               dentro un antenato con `perspective`/`transform` si ancorerebbe a
               quell'antenato invece che al viewport. */
            <BookDialog card={openCard} locale={locale} onClose={close} reduced={reduced} />,
            document.body,
          )
        : null}
    </div>
  );
}

/* ============================================================================
   CSS locale. Come per l'elica, vive qui e non in app/globals.css: quel file è
   condiviso fra più sezioni in lavorazione simultanea e nessuna classe
   `shelf-*`/`book*` deve uscire da questo componente.
   ========================================================================== */

const SHELF_CSS = `
.shelf-root {
  --sc: 1;
  /* profondità dello scaffale: quanto i libri (e i reggilibri) entrano nella
     scena. Vive qui perché la condividono libri e reggilibri. */
  --d: calc(122px * var(--sc));
  --shelf-far:  var(--aqua-900);
  --shelf-near: var(--aqua-600);
  margin-top: 5rem;
}
.shelf-hint {
  margin-top: 10px; font-size: 12.5px; line-height: 1.5; color: var(--text-low);
}
.shelf-reveal { display: block; }

/* --- scena: prospettiva + aurora di contenimento ------------------------- */
.shelf-scene {
  position: relative; margin-top: 30px;
  display: flex; justify-content: center;
  padding: calc(34px * var(--sc)) 16px calc(26px * var(--sc));
  perspective: 1500px; perspective-origin: 50% 42%;
}
.shelf-aurora {
  position: absolute; left: 50%; top: 46%; transform: translate(-50%, -50%);
  width: min(560px, 86%); height: min(300px, 62%);
  border-radius: 999px; pointer-events: none;
  background: radial-gradient(ellipse at center,
    rgb(var(--aqua-rgb) / .16) 0%, rgb(var(--aqua-rgb) / .05) 45%, transparent 72%);
  filter: blur(26px);
}

.shelf-stage {
  --tilt-x: 0deg; --tilt-y: 0deg;
  position: relative; transform-style: preserve-3d;
  /* Rotazione di base: si vedono i dorsi, più un accenno di copertina e di
     taglio superiore. È quell'accenno a far leggere "oggetto" e non "rettangoli".
     rotateX NEGATIVO, non positivo: con CSS la normale del piano superiore è
     (0,−1,0) e la sua z dopo rotateX(a) vale −sin(a), quindi solo con a < 0 la
     faccia guarda la camera. Con +7deg si guarderebbe lo scaffale DA SOTTO e
     backface-visibility:hidden cancellerebbe i piani orizzontali: libri senza
     taglio superiore e ripiano senza superficie d'appoggio. */
  --base-x: -7deg; --base-y: -15deg;
  transform: rotateX(calc(var(--base-x) + var(--tilt-x))) rotateY(calc(var(--base-y) + var(--tilt-y)));
  /* NESSUNA transition: l'angolo è già interpolato in JS (inseguimento
     esponenziale). Una transition qui ripartirebbe a ogni frame e combatterebbe
     con quell'interpolazione — era una delle fonti degli scatti. */
}

/* --- fila di libri ------------------------------------------------------- */
.shelf-books {
  position: relative; transform-style: preserve-3d;
  display: flex; align-items: flex-end; justify-content: center;
  gap: calc(5px * var(--sc));
  padding: 0 calc(16px * var(--sc));
  min-height: calc(var(--tallest, 200px) * var(--sc));
}

/* reggilibri: chiudono la fila, così due soli libri leggono "voluti" e non
   "rimasti soli". Crescono con l'altezza del libro più alto. */
.shelf-end {
  align-self: flex-end; flex: none;
  width: calc(7px * var(--sc));
  height: calc((var(--tallest, 200px) + 16px) * var(--sc));
  /* portato sul piano dei dorsi: a z=0 resterebbe infilato a metà dei libri. */
  transform: translateZ(calc(var(--d) / 2));
  background: linear-gradient(180deg, rgb(var(--aqua-rgb) / .34), rgb(var(--aqua-rgb) / .08));
  border-radius: 2px;
  box-shadow: 0 0 14px -3px rgb(var(--aqua-rgb) / .4);
}
.shelf-end--l { margin-right: calc(7px * var(--sc)); }
.shelf-end--r { margin-left: calc(7px * var(--sc)); }

/* --- il libro: una scatola 3D di sei facce, di cui tre visibili ---------- */
/* Curva unica per ogni movimento del libro: una decelerazione morbida, senza
   overshoot (niente --ease-spring/--ease-wobble: il rimbalzo è tremolio). */
.shelf-root, .shelf-overlay { --book-ease: cubic-bezier(.25, .75, .3, 1); }

/* Il BOTTONE non si muove mai: porta solo la micro-inclinazione statica. È la
   superficie di hover/click, quindi deve restare dov'è. */
.book {
  position: relative; flex: none; padding: 0; border: 0; background: none;
  width: calc(var(--bw) * var(--sc));
  height: calc(var(--bh) * var(--sc));
  transform-style: preserve-3d;
  transform: rotate(var(--lean));
  transform-origin: 50% 100%;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.book:focus-visible { outline: none; }

/* superficie di click ferma, sul piano dei dorsi e un filo più alta in cima,
   così anche il libro sfilato resta "sotto il dito". */
.book-hit {
  position: absolute; left: 0; right: 0; top: calc(-10px * var(--sc)); bottom: 0;
  transform: translateZ(calc(var(--d) / 2));
}

/* il corpo 3D: l'unico elemento animato. Una sola transition, su transform. */
.book-body {
  position: absolute; inset: 0; display: block;
  transform-style: preserve-3d; pointer-events: none;
  transform: translate3d(0, 0, 0);
  transition: transform 420ms var(--book-ease);
  will-change: transform;
}
/* A′ — sfilato dallo scaffale: qualche px avanti e in su, come tirato da un
   dito. Nessuna rotazione, nessuna oscillazione (§5.1). */
.book:hover .book-body,
.book:focus-visible .book-body {
  transform: translate3d(0, calc(-4px * var(--sc)), calc(16px * var(--sc)));
}
/* pressione: si assesta, rientra appena, più rapido e sempre senza rimbalzo. */
.book:active .book-body {
  transform: translate3d(0, calc(-2.5px * var(--sc)), calc(11px * var(--sc)));
  transition-duration: 200ms;
}
/* aperto: esce di più mentre la scheda compare. */
.book[data-open="true"] .book-body {
  transform: translate3d(0, calc(-9px * var(--sc)), calc(34px * var(--sc)));
  transition-duration: 560ms;
}

/* luce: un velo sopra il dorso, animato in OPACITÀ. Niente \`filter\` sul
   libro: su un elemento preserve-3d appiattisce la scatola a ogni hover. */
.book-light {
  position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
  background: linear-gradient(100deg, rgb(var(--aqua-rgb) / .22), rgb(255 255 255 / .06) 40%, transparent 80%);
  opacity: 0;
  transition: opacity 420ms var(--book-ease);
}
.book:hover .book-light, .book:focus-visible .book-light { opacity: .75; }
.book:active .book-light { opacity: .9; transition-duration: 200ms; }
.book[data-open="true"] .book-light { opacity: 1; }
.book:focus-visible .book-spine {
  box-shadow:
    inset 0 0 0 1.5px var(--aqua-200),
    inset -1px 0 0 rgb(0 0 0 / .5),
    0 0 22px -2px rgb(var(--aqua-rgb) / .6);
}

.book-face {
  position: absolute; left: 50%; top: 50%;
  border-radius: 1.5px;
  backface-visibility: hidden;
}

/* dorso — W × H, spinto avanti di D/2 */
.book-spine {
  width: calc(var(--bw) * var(--sc)); height: calc(var(--bh) * var(--sc));
  margin-left: calc(var(--bw) * var(--sc) / -2);
  margin-top: calc(var(--bh) * var(--sc) / -2);
  transform: translateZ(calc(var(--d) / 2));
  display: flex; flex-direction: column; align-items: center;
  padding: calc(11px * var(--sc)) 0;
  overflow: hidden;
  /* il tono di ogni libro è un punto sulla rampa aqua: nessun secondo colore,
     solo profondità di valore. La luce viene da sinistra-alto. */
  background:
    linear-gradient(100deg,
      rgb(var(--aqua-rgb) / .22) 0%,
      rgb(var(--aqua-rgb) / .05) 16%,
      transparent 34%),
    linear-gradient(180deg, rgb(255 255 255 / .05), transparent 30%),
    color-mix(in oklab, var(--shelf-near) var(--tone), var(--shelf-far));
  box-shadow:
    inset -1px 0 0 rgb(0 0 0 / .5),
    inset 1px 0 0 rgb(var(--aqua-rgb) / .3),
    0 0 18px -6px rgb(var(--aqua-rgb) / .45);
}
.book-band {
  flex: none; width: 64%; height: 1px;
  background: rgb(var(--aqua-rgb) / .55);
  box-shadow: 0 0 6px rgb(var(--aqua-rgb) / .5);
}
.book-band--t { margin-bottom: calc(9px * var(--sc)); }
.book-band--b { margin-top: calc(9px * var(--sc)); }

/* titolo sul dorso: testo reale ruotato, non un'immagine.
   Troncato otticamente; nel DOM resta completo per gli screen reader. */
.book-title {
  flex: 1 1 auto; min-height: 0;
  writing-mode: vertical-rl;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-family: var(--font-display); font-weight: 500;
  font-size: calc(11.5px * var(--sc)); letter-spacing: .012em;
  color: var(--aqua-100);
  text-shadow: 0 0 10px rgb(var(--aqua-rgb) / .45);
}
/* pastiglia discreta sui titoli non ancora online: lo stato si vede già sullo
   scaffale, non solo dentro la scheda. */
.book-pin {
  flex: none; width: calc(5px * var(--sc)); height: calc(5px * var(--sc));
  margin-top: calc(7px * var(--sc)); border-radius: 999px;
  background: var(--text-low); opacity: .85;
}

/* copertina (faccia destra) — D × H */
.book-cover {
  width: var(--d); height: calc(var(--bh) * var(--sc));
  margin-left: calc(var(--d) / -2);
  margin-top: calc(var(--bh) * var(--sc) / -2);
  transform: rotateY(90deg) translateZ(calc(var(--bw) * var(--sc) / 2));
  background:
    linear-gradient(90deg, rgb(var(--aqua-rgb) / .1), transparent 42%),
    color-mix(in oklab, var(--shelf-far) 78%, #000);
  box-shadow: inset 0 0 0 1px rgb(var(--aqua-rgb) / .12);
}

/* taglio superiore — W × D, con la striatura delle pagine */
.book-top {
  width: calc(var(--bw) * var(--sc)); height: var(--d);
  margin-left: calc(var(--bw) * var(--sc) / -2);
  margin-top: calc(var(--d) / -2);
  transform: rotateX(90deg) translateZ(calc(var(--bh) * var(--sc) / 2));
  background:
    repeating-linear-gradient(90deg,
      rgb(var(--aqua-rgb) / .16) 0 1px,
      transparent 1px 3px),
    linear-gradient(180deg, rgb(var(--aqua-rgb) / .2), rgb(var(--aqua-rgb) / .06));
}

/* --- ripiano ------------------------------------------------------------- */
.shelf-plank {
  position: relative; transform-style: preserve-3d;
  height: calc(13px * var(--sc));
  --pd: calc(140px * var(--sc));
}
.shelf-plank-front, .shelf-plank-top { position: absolute; display: block; }
.shelf-plank-front {
  inset: 0; transform: translateZ(calc(var(--pd) / 2));
  border-radius: 2px;
  background: linear-gradient(180deg,
    color-mix(in oklab, var(--raised-hi) 70%, var(--aqua-900)),
    var(--void));
  box-shadow:
    inset 0 1px 0 rgb(var(--aqua-rgb) / .38),
    0 18px 44px -14px rgb(0 0 0 / .95),
    0 0 30px -8px rgb(var(--aqua-rgb) / .28);
}
/* piano d'appoggio: ruotato attorno al proprio bordo superiore e ricentrato in
   profondità, così i libri ci stanno sopra davvero invece di galleggiare. */
.shelf-plank-top {
  left: 0; right: 0; top: 0; height: var(--pd);
  transform-origin: 50% 0;
  transform: translateZ(calc(var(--pd) / -2)) rotateX(90deg);
  background: linear-gradient(180deg,
    rgb(var(--aqua-rgb) / .17) 0%,
    rgb(var(--aqua-rgb) / .05) 38%,
    rgb(var(--aqua-rgb) / .02) 100%),
    var(--base);
}

/* --- modale -------------------------------------------------------------- */
.shelf-overlay {
  position: fixed; inset: 0; z-index: 120;
  display: flex; align-items: center; justify-content: center; padding: 20px;
  background: rgb(3 7 10 / .74);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
}
.shelf-dialog {
  position: relative; width: min(460px, 100%);
  padding: 26px 26px 24px; border-radius: var(--radius-lg);
  background: linear-gradient(160deg, rgb(17 30 37 / .96), rgb(6 12 16 / .95));
  border: 1px solid rgb(var(--aqua-rgb) / .24);
  box-shadow: var(--shadow-float), 0 0 60px -20px rgb(var(--aqua-rgb) / .5);
  outline: none;
}
.shelf-dialog:focus-visible { box-shadow: var(--shadow-float), 0 0 0 2px rgb(var(--aqua-rgb) / .5); }
.shelf-x {
  position: absolute; top: 12px; right: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 999px;
  border: 1px solid var(--line); background: none; color: var(--text-mid);
  cursor: pointer;
  transition: color var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out);
}
.shelf-x:hover, .shelf-x:focus-visible { color: var(--text-hi); border-color: var(--line-hi); }

.shelf-dialog-eyebrow {
  font-family: var(--font-mono); font-size: 10.5px; line-height: 1;
  letter-spacing: var(--ls-micro); text-transform: uppercase; color: var(--text-low);
}
.shelf-dialog-title {
  margin-top: 12px; padding-right: 26px;
  font-family: var(--font-display); font-weight: 500;
  font-size: var(--fs-h3); line-height: var(--lh-h3); letter-spacing: var(--ls-h3);
  color: var(--text-hi); text-wrap: balance;
}
.shelf-dialog-desc {
  margin-top: 12px; font-size: var(--fs-body); line-height: var(--lh-body);
  color: var(--text-mid); text-wrap: pretty;
}
.shelf-dialog-foot {
  margin-top: 22px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px;
}
.shelf-cta {
  display: inline-flex; align-items: center; gap: 9px;
  padding: 10px 17px; border-radius: 999px;
  border: 1px solid rgb(var(--aqua-rgb) / .38);
  background: rgb(var(--aqua-rgb) / .08);
  font-family: var(--font-mono); font-size: var(--fs-micro);
  text-transform: uppercase; letter-spacing: var(--ls-micro);
  color: var(--aqua-200); text-decoration: none;
  transition: background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out);
}
a.shelf-cta:hover, a.shelf-cta:focus-visible {
  background: rgb(var(--aqua-rgb) / .16); border-color: rgb(var(--aqua-rgb) / .6);
}
.shelf-cta-arrow { display: inline-block; transition: transform 320ms var(--book-ease); }
a.shelf-cta:hover .shelf-cta-arrow, a.shelf-cta:focus-visible .shelf-cta-arrow { transform: translate(2px, -2px); }
a.shelf-cta:focus-visible { outline: 2px solid rgb(var(--aqua-rgb) / .55); outline-offset: 3px; }
.sr-only-shelf {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
.shelf-cta--off {
  color: var(--text-low); border-color: var(--line);
  background: none; cursor: not-allowed;
}
.shelf-cta-tag { color: var(--text-low); text-transform: none; letter-spacing: normal; }
.shelf-dialog-note { font-size: var(--fs-micro); color: var(--text-low); }
.shelf-dialog-pending {
  margin-top: 12px; font-size: 12px; line-height: 1.5; color: var(--text-low);
}

/* --- entrate animate, solo se il moto è gradito ------------------------- */
/* Dissolvenza e un lieve sollevamento, senza scala e senza overshoot: il libro
   esce dallo scaffale mentre la scheda compare, le due curve sono sorelle. */
@media (prefers-reduced-motion: no-preference) {
  .shelf-overlay:not([data-reduced]) { animation: shelf-fade 320ms var(--book-ease, ease-out) both; }
  .shelf-overlay:not([data-reduced]) .shelf-dialog { animation: shelf-rise 420ms var(--book-ease, ease-out) 40ms both; }
}
@keyframes shelf-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes shelf-rise {
  from { opacity: 0; transform: translateY(10px) }
  to   { opacity: 1; transform: none }
}

/* --- moto ridotto: struttura intatta, nessuna animazione ---------------- */
@media (prefers-reduced-motion: reduce) {
  .book-body, .book-light, .shelf-cta-arrow, .shelf-x { transition: none !important; }
  .shelf-overlay, .shelf-dialog { animation: none !important; }
}
.shelf-scene[data-reduced="true"] .book-body,
.shelf-scene[data-reduced="true"] .book-light { transition: none; }
/* Il libro resta raggiungibile e distinguibile anche senza il movimento in
   avanti: con moto ridotto la risposta è solo luminosa. */
.shelf-scene[data-reduced="true"] .book:hover .book-body,
.shelf-scene[data-reduced="true"] .book:focus-visible .book-body,
.shelf-scene[data-reduced="true"] .book:active .book-body,
.shelf-scene[data-reduced="true"] .book[data-open="true"] .book-body {
  transform: none;
}

@media (max-width: 640px) {
  .shelf-root { --sc: .72; }
  .shelf-scene { perspective: 1100px; }
  .shelf-stage { --base-x: -6deg; --base-y: -11deg; }
  .shelf-dialog { padding: 22px 20px 20px; }
}
`;

export default WritingShelf;

/** Etichette condivise con la variante mobile (AboutMobile › WritingStripMobile). */
export { writingCopy };
