/**
 * LA FISICA DELLE LETTERE — integratore minimo, scritto a mano.
 *
 * Nota del cliente sul titolo:
 *   «Aggiungere anche qui l'effetto di wobble, magari lettera per lettera e non
 *    solo: trasformare tutte le lettere in oggetti 3d separati e permettere
 *    all'utente di giocare con la scritta: sfasciare lettere, ricomporre la
 *    frase, etc…»
 *
 * Nessun motore di physics: per qualche decina di glifi bastano posizione,
 * velocità, velocità angolare, uno smorzamento e delle pareti — e costa una
 * frazione di un solutore generico (niente broad-phase, niente vincoli, niente
 * allocazioni per frame: si scrive solo dentro l'array di stato).
 *
 * Due regimi, un solo integratore:
 *
 *   · REST  — le lettere sono a casa loro. Il cursore le tocca: le spinge di
 *             lato, le solleva verso di sé (translateZ) e le fa ruotare; una
 *             molla per-lettera le riporta a posto oscillando. È il "wobble
 *             lettera per lettera". Il testo resta leggibile: lo spostamento a
 *             regime è di una manciata di px.
 *   · LOOSE — dopo lo "sfascia": la molla è spenta, le lettere volano, rimbalzano
 *             contro i bordi dell'area di gioco e si possono prendere e lanciare.
 *             "Ricomponi" rimette semplicemente il regime su REST e le molle
 *             fanno il resto — la frase si ricompone da sola, sempre.
 *
 * Gravità: nessuna. Con la gravità le lettere finiscono tutte in fondo allo
 * schermo in due secondi e il giocattolo si esaurisce; a gravità zero restano
 * nell'area del titolo e si possono continuare a sbattere in giro.
 */

export type GlyphBody = {
  el: HTMLElement;
  /** Centro a riposo, in coordinate dell'host (px). */
  homeX: number;
  homeY: number;
  halfW: number;
  halfH: number;
  /** Spostamento dal riposo (px) — è ciò che finisce nella transform. */
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Rotazioni in gradi. */
  rz: number;
  rx: number;
  ry: number;
  wz: number;
  wx: number;
  wy: number;
  seed: number;
  /** true finché la transform scritta nel DOM non corrisponde allo stato. */
  dirty: boolean;
};

export type PlayBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type StepContext = {
  loose: boolean;
  /** Puntatore in coordinate dell'host; `active` false = fuori pagina. */
  px: number;
  py: number;
  pvx: number;
  pvy: number;
  active: boolean;
  bounds: PlayBounds;
  /** Glifo attualmente trascinato dal puntatore (nessuna fisica su di lui). */
  grabbed: GlyphBody | null;
};

/* --- regime REST: molle strette, il testo torna sempre leggibile ---------- */
const SPRING_XY = 220;
const SPRING_Z = 150;
const SPRING_ROT = 260;
const DAMP_XY = 15;
const DAMP_Z = 12;
const DAMP_ROT = 13;

/* --- il campo del cursore ------------------------------------------------ */
const HOVER_RADIUS = 118;
const HOVER_PUSH = 3000; // px/s²
const HOVER_LIFT = 4200;
const HOVER_TORQUE = 1500; // deg/s²
const HOVER_DRAG = 0.22; // quanto la scia del cursore trascina la lettera

/* --- regime LOOSE: quasi nessun attrito, rimbalzi elastici ---------------- */
const LOOSE_DAMP = 0.34;
const LOOSE_DAMP_ROT = 0.5;
const RESTITUTION = 0.62;
const LOOSE_PUSH = 5200; // il cursore spinge più forte quando è tutto sciolto

/** Sotto questa soglia il sistema è considerato fermo e il loop si spegne. */
const SLEEP_ENERGY = 0.35;

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Un passo di integrazione. Restituisce l'"attività" residua: quando scende
 * sotto SLEEP_ENERGY in regime REST il chiamante può fermare il rAF — un
 * titolo fermo non deve costare un frame.
 */
export function stepLetters(
  bodies: GlyphBody[],
  dt: number,
  ctx: StepContext,
): number {
  const dampXY = Math.exp(-(ctx.loose ? LOOSE_DAMP : DAMP_XY) * dt);
  const dampZ = Math.exp(-(ctx.loose ? LOOSE_DAMP : DAMP_Z) * dt);
  const dampRot = Math.exp(-(ctx.loose ? LOOSE_DAMP_ROT : DAMP_ROT) * dt);
  const push = ctx.loose ? LOOSE_PUSH : HOVER_PUSH;
  const radius = ctx.loose ? HOVER_RADIUS * 1.35 : HOVER_RADIUS;
  const r2 = radius * radius;

  let activity = 0;

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b === ctx.grabbed) {
      b.dirty = true;
      activity += 10;
      continue;
    }

    /* --- il campo del cursore: spinta laterale, sollevamento, coppia --- */
    if (ctx.active) {
      const cx = b.homeX + b.x;
      const cy = b.homeY + b.y;
      let dx = cx - ctx.px;
      let dy = cy - ctx.py;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2) {
        const d = Math.sqrt(d2) || 1;
        const fall = 1 - d / radius;
        const f = fall * fall;
        dx /= d;
        dy /= d;
        b.vx += dx * push * f * dt;
        b.vy += dy * push * f * dt;
        b.vz += HOVER_LIFT * f * dt;
        // la lettera si gira verso il cursore mentre lo scansa: due gesti
        // diversi, non lo stesso movimento raddoppiato
        b.wz += -dx * HOVER_TORQUE * f * dt * (0.6 + b.seed * 0.8);
        b.wy += dx * HOVER_TORQUE * 0.8 * f * dt;
        b.wx += -dy * HOVER_TORQUE * 0.6 * f * dt;
        // e viene trascinata dalla scia del puntatore
        b.vx += ctx.pvx * HOVER_DRAG * f;
        b.vy += ctx.pvy * HOVER_DRAG * f;
      }
    }

    /* --- molle di richiamo (spente in regime LOOSE) --- */
    if (!ctx.loose) {
      b.vx -= SPRING_XY * b.x * dt;
      b.vy -= SPRING_XY * b.y * dt;
      b.vz -= SPRING_Z * b.z * dt;
      b.wz -= SPRING_ROT * b.rz * dt;
      b.wx -= SPRING_ROT * b.rx * dt;
      b.wy -= SPRING_ROT * b.ry * dt;
    }

    b.vx *= dampXY;
    b.vy *= dampXY;
    b.vz *= dampZ;
    b.wz *= dampRot;
    b.wx *= dampRot;
    b.wy *= dampRot;

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    b.rz += b.wz * dt;
    b.rx += b.wx * dt;
    b.ry += b.wy * dt;

    /* --- pareti: l'area di gioco è il viewport, mai fuori schermo --- */
    const cx = b.homeX + b.x;
    const cy = b.homeY + b.y;
    const minX = ctx.bounds.minX + b.halfW;
    const maxX = ctx.bounds.maxX - b.halfW;
    const minY = ctx.bounds.minY + b.halfH;
    const maxY = ctx.bounds.maxY - b.halfH;

    if (cx < minX) {
      b.x = minX - b.homeX;
      b.vx = Math.abs(b.vx) * RESTITUTION;
      b.wz += b.vy * 0.05;
    } else if (cx > maxX) {
      b.x = maxX - b.homeX;
      b.vx = -Math.abs(b.vx) * RESTITUTION;
      b.wz -= b.vy * 0.05;
    }
    if (cy < minY) {
      b.y = minY - b.homeY;
      b.vy = Math.abs(b.vy) * RESTITUTION;
    } else if (cy > maxY) {
      b.y = maxY - b.homeY;
      b.vy = -Math.abs(b.vy) * RESTITUTION;
    }

    b.z = clamp(b.z, -260, 260);
    if (b.z <= -260 || b.z >= 260) b.vz = -b.vz * RESTITUTION;

    // In regime LOOSE lo scostamento da casa NON conta come attività: le
    // lettere sono lontane per definizione, e se si sono fermate il loop deve
    // potersi spegnere (si risveglia al primo evento del puntatore).
    activity +=
      Math.abs(b.vx) +
      Math.abs(b.vy) +
      Math.abs(b.vz) * 0.5 +
      (Math.abs(b.wz) + Math.abs(b.wx) + Math.abs(b.wy)) * 0.4 +
      (ctx.loose
        ? 0
        : (Math.abs(b.x) + Math.abs(b.y) + Math.abs(b.z)) * 2 +
          (Math.abs(b.rz) + Math.abs(b.rx) + Math.abs(b.ry)) * 3);
    b.dirty = true;
  }

  return activity / Math.max(bodies.length, 1);
}

/** Il sistema è abbastanza fermo da poter spegnere il rAF? */
export function isAsleep(activity: number) {
  return activity < SLEEP_ENERGY;
}

/** Rimette tutto a zero, esattamente (niente residui sub-pixel). */
export function restLetters(bodies: GlyphBody[]) {
  for (const b of bodies) {
    b.x = b.y = b.z = 0;
    b.vx = b.vy = b.vz = 0;
    b.rz = b.rx = b.ry = 0;
    b.wz = b.wx = b.wy = 0;
    b.dirty = true;
  }
}

/**
 * Lo "sfascia": un'esplosione radiale da `(ox, oy)`, con energia decrescente
 * con la distanza — le lettere vicine all'origine partono per prime e più
 * forte, quindi si legge un'onda d'urto e non uno scoppio uniforme.
 */
export function burstLetters(
  bodies: GlyphBody[],
  ox: number,
  oy: number,
  power = 1,
) {
  for (const b of bodies) {
    const cx = b.homeX + b.x;
    const cy = b.homeY + b.y;
    let dx = cx - ox;
    let dy = cy - oy;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    const fall = 1 / (1 + d / 320);
    const speed = (360 + b.seed * 520) * fall * power;
    b.vx += dx * speed + (b.seed - 0.5) * 120;
    b.vy += dy * speed - 160 * fall; // un filo verso l'alto: "scoppia", non "cade"
    b.vz += (b.seed - 0.5) * 520;
    b.wz += (b.seed - 0.5) * 1400 * fall;
    b.wx += (b.seed - 0.5) * 900 * fall;
    b.wy += (0.5 - b.seed) * 1100 * fall;
    b.dirty = true;
  }
}

/** Scrive nel DOM solo i glifi che si sono davvero mossi. */
export function commitLetters(bodies: GlyphBody[], perspective = 780) {
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (!b.dirty) continue;
    b.dirty = false;
    const x = Math.round(b.x * 100) / 100;
    const y = Math.round(b.y * 100) / 100;
    const z = Math.round(b.z * 100) / 100;
    if (x === 0 && y === 0 && z === 0 && b.rz === 0 && b.rx === 0 && b.ry === 0) {
      b.el.style.transform = "";
      continue;
    }
    b.el.style.transform =
      `perspective(${perspective}px) translate3d(${x}px, ${y}px, ${z}px) ` +
      `rotateX(${Math.round(b.rx * 10) / 10}deg) ` +
      `rotateY(${Math.round(b.ry * 10) / 10}deg) ` +
      `rotate(${Math.round(b.rz * 10) / 10}deg)`;
  }
}
