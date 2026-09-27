"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { gsap, ensureGsapRegistered } from "@/lib/animation/gsap";
import { Button } from "@/components/ui/Button";
import { StitchUnderline } from "./StitchUnderline";
import {
  burstLetters,
  commitLetters,
  isAsleep,
  restLetters,
  stepLetters,
  type GlyphBody,
  type StepContext,
} from "./letterDynamics";
import type { HeroCopy } from "@/content/hero";

/* ============================================================================
   L'H1 GIOCABILE
   ----------------------------------------------------------------------------
   Nota del cliente: «trasformare tutte le lettere in oggetti 3d separati e
   permettere all'utente di giocare con la scritta: sfasciare lettere,
   ricomporre la frase, etc…»

   ── CSS 3D, non WebGL ──────────────────────────────────────────────────────
   Le lettere sono i glifi VERI del titolo, ognuno in uno `<span>` che riceve
   `perspective() translate3d() rotateX/Y/Z()`. Non sono mesh in una scena.
   Le ragioni, in ordine di peso:

   1. il titolo deve restare TESTO. Selezionabile, copiabile, letto dagli screen
      reader, indicizzabile, e reso con l'hinting del sistema. Un h1 in WebGL è
      un'immagine di un titolo;
   2. "cucio su misura" è in Instrument Serif italic aqua con il filo che cuce
      sotto — la firma tipografica del sito (ART-DIRECTION §2). In WebGL
      servirebbe un atlante MSDF per OGNI famiglia e peso, generato a build
      time: i font qui sono self-hosted e non è possibile aggiungere dipendenze;
   3. costo: ~55 glifi animati via `transform` sono ~55 layer compositati dalla
      GPU, con zero reflow. L'hero sta già facendo girare un sistema particellare
      a tutta viewport e il campo globale del fondo: aggiungere un TERZO contesto
      WebGL (o far convivere testo e mesh nello stesso) sarebbe il modo più
      rapido di perdere i 60fps.

   ── LA LEGGIBILITÀ VINCE SUL GIOCATTOLO ────────────────────────────────────
   · al caricamento la frase è testo normale, a posto e leggibile;
   · lo sfascio NON avviene da solo: parte da un comando esplicito (o dal
     trascinamento di una lettera). Chi non lo cerca non lo incontra mai;
   · "Ricomponi" è sempre presente, e anche `Esc` ricompone;
   · l'h1 nel DOM è il testo reale (i glifi sono figli di uno span per parola:
     gli a-capo restano ai confini di parola, come prima). `aria-label` porta la
     frase intera, così nessuno screen reader può leggerla lettera per lettera;
   · sotto `prefers-reduced-motion` non esiste né il giocattolo né i comandi.
   ========================================================================== */

const STYLES = `
.hh-line { display: block; }
.hh-w {
  display: inline-block;
  vertical-align: bottom;
  padding-bottom: 0.14em; margin-bottom: -0.14em;
  padding-top: 0.06em;    margin-top: -0.06em;
}
/* la maschera del reveal esiste SOLO durante il reveal: dopo, le lettere devono
   poter uscire dalla loro parola senza essere tagliate */
[data-hh="armed"] .hh-w { overflow: hidden; }
.hh-wi { display: inline-block; }
.hh-g  { display: inline-block; }
[data-hh-active="1"] .hh-g { will-change: transform; }
[data-hh-loose="1"] .hh-h1 {
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
[data-hh-loose="1"] .hh-h1:active { cursor: grabbing; }
.hh-controls-in { animation: hh-controls-in 0.5s var(--ease-out) both; }
@keyframes hh-controls-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .hh-controls { display: none; }
  .hh-g { transform: none !important; }
}
`;

type HeroHeadlineProps = {
  copy: HeroCopy;
  reducedMotion: boolean;
  /** Ritardi (s) delle tre righe e del filo (ms) — dalla timeline madre dell'hero. */
  timing: { line1: number; line2: number; line3: number; stitchMs: number };
  /** "gsap" (default, desktop): reveal per parola via GSAP dopo l'idratazione.
   *  "css" (mobile): il reveal è un'animazione CSS del chiamante, che parte al
   *  primo paint senza aspettare il JS; qui si attende solo che finisca. */
  revealMode?: "gsap" | "css";
};

type Mode = "rest" | "loose";

/** Spezza una stringa in parole mascherate → glifi. Gli spazi restano testo. */
function words(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const tokens = text.split(/(\s+)/);
  tokens.forEach((token, i) => {
    if (token === "") return;
    if (/^\s+$/.test(token)) {
      out.push(<span key={`${keyBase}-s${i}`}>{token}</span>);
      return;
    }
    out.push(
      <span key={`${keyBase}-w${i}`} className="hh-w">
        <span className="hh-wi">
          {Array.from(token).map((ch, j) => (
            <span key={`${keyBase}-w${i}-g${j}`} className="hh-g">
              {ch}
            </span>
          ))}
        </span>
      </span>,
    );
  });
  return out;
}

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function HeroHeadline({ copy, reducedMotion, timing, revealMode = "gsap" }: HeroHeadlineProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);

  const [revealed, setRevealed] = useState(reducedMotion);
  const [mode, setMode] = useState<Mode>("rest");

  const bodiesRef = useRef<GlyphBody[]>([]);
  const modeRef = useRef<Mode>("rest");
  const wakeRef = useRef<() => void>(() => {});
  const originRef = useRef({ x: 0, y: 0 });

  /* ------------------------------------------------------------------------
     1. Il reveal per parola (ART-DIRECTION §4), fatto qui e non da TextReveal:
        serve il controllo del DOM fino al singolo glifo, e serve sapere
        ESATTAMENTE quando il titolo è fermo — è quel momento a far nascere il
        giocattolo, misurando le lettere dove si sono posate.
     --------------------------------------------------------------------- */
  const revealDoneRef = useRef(false);

  useIsoLayoutEffect(() => {
    if (reducedMotion || revealDoneRef.current) {
      setRevealed(true);
      return;
    }
    revealDoneRef.current = true;
    const h1 = h1Ref.current;
    if (!h1) return;
    if (revealMode === "css") {
      // il reveal CSS è già partito (o finito) prima dell'idratazione: il
      // giocattolo nasce quando le lettere sono ferme
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        setRevealed(true);
      };
      const anims = h1.getAnimations?.({ subtree: true }) ?? [];
      Promise.all(anims.map((a) => a.finished)).then(finish, finish);
      const t = window.setTimeout(finish, 2600);
      return () => {
        done = true;
        window.clearTimeout(t);
        revealDoneRef.current = false;
      };
    }
    const lines = Array.from(h1.querySelectorAll<HTMLElement>(".hh-line"));
    if (lines.length === 0) {
      setRevealed(true);
      return;
    }

    const delays = [timing.line1, timing.line2, timing.line3];
    let watchdog = 0;

    try {
      ensureGsapRegistered();
      const ctx = gsap.context(() => {
        lines.forEach((line, i) => {
          const inners = line.querySelectorAll<HTMLElement>(".hh-wi");
          if (inners.length === 0) return;
          gsap.set(inners, { yPercent: 110, willChange: "transform" });
          gsap.to(inners, {
            yPercent: 0,
            duration: 0.9,
            delay: delays[i] ?? delays[delays.length - 1],
            stagger: 0.05,
            ease: "power3.out",
            onComplete: () => {
              gsap.set(inners, { clearProps: "transform,willChange" });
              if (i === lines.length - 1) setRevealed(true);
            },
          });
        });
      }, h1);

      // rete di sicurezza: qualunque cosa vada storta, il titolo è comunque a
      // posto e il giocattolo comunque disponibile.
      watchdog = window.setTimeout(() => setRevealed(true), 3400);

      return () => {
        window.clearTimeout(watchdog);
        ctx.revert();
        // smontato davvero (StrictMode in dev, cambio di lingua): il prossimo
        // mount deve poter rifare il suo ingresso.
        revealDoneRef.current = false;
      };
    } catch {
      setRevealed(true);
      return undefined;
    }
  }, [reducedMotion, timing.line1, timing.line2, timing.line3, revealMode]);

  /* ------------------------------------------------------------------------
     2. Il giocattolo: misura, loop, cursore, trascinamento.
     --------------------------------------------------------------------- */
  useEffect(() => {
    if (reducedMotion || !revealed) return;
    const host = hostRef.current;
    const h1 = h1Ref.current;
    if (!host || !h1) return;

    const els = Array.from(h1.querySelectorAll<HTMLElement>(".hh-g"));
    if (els.length === 0) return;

    const bodies: GlyphBody[] = els.map((el, i) => ({
      el,
      homeX: 0,
      homeY: 0,
      halfW: 6,
      halfH: 10,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rz: 0,
      rx: 0,
      ry: 0,
      wz: 0,
      wx: 0,
      wy: 0,
      // fase deterministica per lettera: due glifi vicini non reagiscono
      // mai in modo identico, ma il risultato è lo stesso a ogni load
      seed: ((i * 2654435761) % 1000) / 1000,
      dirty: false,
    }));
    bodiesRef.current = bodies;

    /* --- GEOMETRIA: tutto in coordinate di DOCUMENTO, mai di viewport ------
       BUG storico (cliente: «se interagisco con la scritta e poi scrollo, le
       scritte si sovrappongono»): le pareti dell'area di gioco erano il
       VIEWPORT, ricalcolate a ogni frame come `-(topDoc - scrollY) + 78`.
       Scorrendo, la parete superiore scendeva insieme allo schermo e
       spingeva giù ogni lettera che finiva sopra di lei: tutte e tre le righe
       venivano schiacciate sulla stessa Y (translate3d(0, +scrollY, 0)) e la
       molla, che le richiamava a casa, combatteva la parete per sempre — il
       loop non si addormentava mai. Ora l'area di gioco è la SEZIONE hero,
       misurata una volta (resize/font) in coordinate dell'host: è ferma
       rispetto al documento, quindi lo scroll non la sposta di un pixel. */
    const section = (host.closest("section") as HTMLElement | null) ?? host;
    const geom = { left: 0, topDoc: 0, w: 0, h: 0 };
    const walls = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

    const measure = () => {
      const hr = host.getBoundingClientRect();
      const sr = section.getBoundingClientRect();
      geom.left = hr.left;
      geom.topDoc = hr.top + window.scrollY;
      geom.w = hr.width;
      geom.h = hr.height;
      // pareti = box della sezione (meno la nav in alto), relative all'host.
      // Differenze fra due rect letti nello stesso istante: indipendenti da
      // scrollY per costruzione.
      walls.minX = Math.max(sr.left, 0) - hr.left + 10;
      walls.maxX = Math.min(sr.right, window.innerWidth) - hr.left - 10;
      walls.minY = sr.top - hr.top + 78;
      walls.maxY = sr.bottom - hr.top - 10;
      originRef.current.x = hr.width * 0.42;
      originRef.current.y = hr.height * 0.55;
      // le posizioni di riposo si misurano solo a lettere ferme: un rect letto
      // mentre il glifo è ruotato è l'AABB della rotazione, non la sua casa.
      if (modeRef.current !== "rest") return;
      for (const b of bodies) {
        const r = b.el.getBoundingClientRect();
        b.halfW = r.width / 2;
        b.halfH = r.height / 2;
        b.homeX = r.left - hr.left + r.width / 2 - b.x;
        b.homeY = r.top - hr.top + r.height / 2 - b.y;
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    document.fonts?.ready.then(measure).catch(() => {});

    /* --- puntatore --- */
    // Il puntatore è conservato in coordinate CLIENT e convertito in
    // coordinate dell'host ogni volta che serve, con lo scrollY del momento:
    // se la pagina scorre sotto un cursore fermo, la sua posizione relativa
    // al titolo cambia davvero (prima restava quella dell'ultimo pointermove).
    const ptr = {
      cx: -9999, cy: -9999,
      x: -9999, y: -9999, px: -9999, py: -9999, vx: 0, vy: 0, active: false,
    };
    let grabbed: GlyphBody | null = null;
    let grabDX = 0;
    let grabDY = 0;

    const syncPtr = () => {
      ptr.x = ptr.cx - geom.left;
      ptr.y = ptr.cy - (geom.topDoc - window.scrollY);
    };
    const toHost = (e: PointerEvent) => {
      ptr.cx = e.clientX;
      ptr.cy = e.clientY;
      syncPtr();
    };

    const near = () =>
      ptr.x > -160 && ptr.x < geom.w + 160 && ptr.y > -160 && ptr.y < geom.h + 160;

    const onMove = (e: PointerEvent) => {
      toHost(e);
      const wasActive = ptr.active;
      ptr.active = near();
      if (grabbed) {
        grabbed.x = ptr.x - grabDX - grabbed.homeX;
        grabbed.y = ptr.y - grabDY - grabbed.homeY;
      }
      if (ptr.active || wasActive || grabbed) wake();
    };

    const onLeave = () => {
      ptr.active = false;
      // finestra persa (altra scheda, alt-tab) con una lettera in mano: la si
      // lascia andare ferma. Senza, al ritorno resterebbe incollata a un
      // puntatore che non la tiene più.
      if (grabbed) {
        grabbed.vx = grabbed.vy = grabbed.vz = 0;
        grabbed = null;
      }
      ptr.px = -9999;
      ptr.vx = ptr.vy = 0;
      wake();
    };
    const onVisibility = () => {
      if (document.hidden) onLeave();
    };

    const onDown = (e: PointerEvent) => {
      // in stato di riposo il titolo è testo: si seleziona, non si afferra.
      if (modeRef.current !== "loose") return;
      toHost(e);
      let best: GlyphBody | null = null;
      let bestD = 64 * 64;
      for (const b of bodies) {
        const dx = b.homeX + b.x - ptr.x;
        const dy = b.homeY + b.y - ptr.y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = b;
        }
      }
      if (!best) return;
      e.preventDefault();
      grabbed = best;
      grabDX = ptr.x - (best.homeX + best.x);
      grabDY = ptr.y - (best.homeY + best.y);
      best.vx = best.vy = best.vz = 0;
      host.setPointerCapture?.(e.pointerId);
      wake();
    };

    const onUp = () => {
      if (!grabbed) return;
      // la lettera parte con la velocità che aveva il puntatore: si LANCIA
      grabbed.vx = ptr.vx * 0.85;
      grabbed.vy = ptr.vy * 0.85;
      grabbed.wz += (ptr.vx - ptr.vy) * 0.25;
      grabbed = null;
      wake();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || modeRef.current !== "loose") return;
      modeRef.current = "rest";
      setMode("rest");
      wake();
    };

    /* --- il loop: gira solo quando c'è qualcosa da muovere --- */
    let raf = 0;
    let last = 0;
    let idleFrames = 0;

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
      h1.removeAttribute("data-hh-active");
    };

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;

      // velocità del puntatore, in px/s, smorzata
      // (in coordinate CLIENT: lo scroll non è un gesto del puntatore)
      if (dt > 1e-4 && ptr.px > -9000) {
        const vx = (ptr.cx - ptr.px) / dt;
        const vy = (ptr.cy - ptr.py) / dt;
        ptr.vx += (vx - ptr.vx) * 0.4;
        ptr.vy += (vy - ptr.vy) * 0.4;
      }
      ptr.px = ptr.cx;
      ptr.py = ptr.cy;

      syncPtr();
      if (grabbed) {
        grabbed.x = ptr.x - grabDX - grabbed.homeX;
        grabbed.y = ptr.y - grabDY - grabbed.homeY;
      }
      const ctx: StepContext = {
        loose: modeRef.current === "loose",
        px: ptr.x,
        py: ptr.y,
        pvx: ptr.vx,
        pvy: ptr.vy,
        active: ptr.active && !grabbed,
        grabbed,
        // l'area di gioco è la sezione hero (coordinate di documento): lo
        // scroll non la muove, quindi non può più schiacciare le righe.
        bounds: walls,
      };

      const activity = stepLetters(bodies, dt, ctx);
      commitLetters(bodies);

      if (!grabbed && isAsleep(activity)) {
        idleFrames += 1;
        if (idleFrames > 8) {
          // a frase intera si azzera tutto esattamente (niente residui
          // sub-pixel); a frase sfasciata le lettere restano dove sono — si
          // sono solo fermate, e il primo tocco le rimette in moto.
          if (!ctx.loose) {
            restLetters(bodies);
            commitLetters(bodies);
          }
          stop();
          return;
        }
      } else {
        idleFrames = 0;
      }
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf) return;
      idleFrames = 0;
      h1.setAttribute("data-hh-active", "1");
      raf = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;

    /* --- scroll: la posizione relativa del cursore cambia anche senza
           pointermove. E se il titolo esce dallo schermo mentre è sfasciato,
           si ricompone da solo: chi torna su trova la frase, non i cocci. --- */
    const onScroll = () => {
      if (grabbed) return;
      // mentre la pagina scorre il titolo NON reagisce al cursore fermo che
      // gli passa sopra: si riattiva al prossimo pointermove vero.
      if (ptr.active) {
        ptr.active = false;
        wake();
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e || e.isIntersecting) return;
        grabbed = null;
        if (modeRef.current === "loose") {
          modeRef.current = "rest";
          setMode("rest");
          wake();
        }
      },
      { threshold: 0 },
    );
    io.observe(host);
    window.addEventListener("scroll", onScroll, { passive: true });

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", measure);
    window.addEventListener("keydown", onKey);
    host.addEventListener("pointerdown", onDown);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", measure);
      window.removeEventListener("keydown", onKey);
      host.removeEventListener("pointerdown", onDown);
      restLetters(bodies);
      commitLetters(bodies);
      bodiesRef.current = [];
      wakeRef.current = () => {};
    };
  }, [reducedMotion, revealed, copy]);

  /* --- i due comandi ---------------------------------------------------- */
  const smash = useCallback(() => {
    const bodies = bodiesRef.current;
    if (bodies.length === 0) return;
    modeRef.current = "loose";
    setMode("loose");
    burstLetters(bodies, originRef.current.x, originRef.current.y, 1);
    wakeRef.current();
  }, []);

  const recompose = useCallback(() => {
    modeRef.current = "rest";
    setMode("rest");
    wakeRef.current();
  }, []);

  const playable = revealed && !reducedMotion;

  return (
    <div
      ref={hostRef}
      className="relative"
      data-hh={revealed ? "live" : "armed"}
      data-hh-loose={mode === "loose" ? "1" : undefined}
    >
      <style>{STYLES}</style>

      {/* ------------------------------------------------------------------
          H1 — tre righe CONTROLLATE, mai un a-capo casuale:
            Progetto il futuro
            e lo ⟨cucio su misura⟩,        ← Instrument Serif italic aqua + filo
            per te e la tua azienda.
          `--hero-safe-top` (su HeroSection) garantisce che non finisca sotto
          la nav; `--measure-hero` + text-wrap:balance tengono la misura.
          `aria-label` porta la frase intera: agli screen reader arriva una
          frase, non una sfilza di glifi.
         ------------------------------------------------------------------ */}
      <h1
        ref={h1Ref}
        className="hh-h1 mt-6 sm:mt-8"
        aria-label={copy.headlineFull}
        // convenzione del cursore custom (components/fx/CustomCursor): a frase
        // sfasciata l'anello mostra ↔, perché le lettere si possono prendere.
        data-cursor={mode === "loose" ? "drag" : undefined}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--fs-hero)",
          fontWeight: 500,
          lineHeight: "var(--lh-hero)",
          letterSpacing: "var(--ls-hero)",
          color: "var(--text-hi)",
          // --measure-hero (18ch) è la misura per cui la scala --fs-hero è stata
          // disegnata: a questa larghezza le tre righe stanno in tre righe. Il
          // titolo esce quindi dalla colonna di testo e prende tutta la sua
          // misura, passando davanti alla scena (che è decorativa e sfocata).
          maxWidth: "min(100%, var(--measure-hero))",
          textWrap: "balance",
        }}
      >
        <span className="hh-line">{words(copy.headlineLine1, "l1")}</span>

        <span className="hh-line">
          {words(copy.headlineLine2Pre, "l2a")}
          <span
            className="serif-accent"
            style={{
              position: "relative",
              display: "inline-block",
              maxWidth: "100%",
              paddingBottom: "0.1em",
            }}
          >
            {words(copy.headlineEmphasis, "l2b")}
            <StitchUnderline
              reducedMotion={reducedMotion}
              startDelayMs={timing.stitchMs}
              dim={mode === "loose"}
            />
          </span>
          {copy.headlineLine2Post ? words(copy.headlineLine2Post, "l2c") : null}
        </span>

        <span className="hh-line">{words(copy.headlineLine3, "l3")}</span>
      </h1>

      {/* --- i comandi del giocattolo: lo sfascio è sempre una scelta di chi
              guarda, e il ritorno è sempre a un click di distanza --- */}
      {/* Lo spazio dei comandi è riservato DA SUBITO, anche prima che esistano:
          farli comparire a reveal finito senza aver tenuto il posto sposterebbe
          in basso mezzo hero a un secondo e mezzo dal caricamento (CLS). */}
      <div className="hh-controls mt-5" style={{ minHeight: 34 }}>
        {playable && (
          <div className="hh-controls-in flex flex-wrap items-center gap-x-6 gap-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={smash}
            aria-label={copy.playSmashAria}
          >
            {mode === "loose" ? copy.playSmashAgain : copy.playSmash}
          </Button>
          {/* Sempre presente, anche a frase intera: la via del ritorno non deve
              mai essere qualcosa da cercare. A riposo è solo più sommessa. */}
          <span style={{ opacity: mode === "loose" ? 1 : 0.5, transition: "opacity .28s var(--ease-out)" }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={recompose}
              aria-label={copy.playResetAria}
            >
              {copy.playReset}
            </Button>
          </span>
          {mode === "loose" && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--fs-micro)",
                letterSpacing: "var(--ls-micro)",
                textTransform: "uppercase",
                color: "var(--text-low)",
              }}
            >
              {copy.playHint}
            </span>
          )}
          </div>
        )}
      </div>
    </div>
  );
}

export default HeroHeadline;
