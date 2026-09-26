/* ============================================================================
   LA FAGLIA — geometria condivisa tra lo shader dell'aurora (WebGL) e il
   livello dei glifi (2D). La curva DEVE essere identica nei due mondi: i numeri
   nascono esattamente sulla linea di luce, quindi la stessa formula vive qui in
   TypeScript e, riga per riga, in GLSL (`RIFT_GLSL`).

   Coordinate: px CSS del canvas di effetto (origine in alto a sinistra).
   ========================================================================== */

export type RiftParams = {
  /** x della faglia al bordo alto del canvas (px) */
  xTop: number;
  /** x della faglia al bordo basso del canvas (px) */
  xBot: number;
  /** pancia della curva a metà altezza (px, + verso destra) */
  bow: number;
  /** ampiezza dell'ondulazione lenta (px) */
  amp: number;
  /** altezza del canvas (px) */
  h: number;
};

export function riftX(y: number, t: number, p: RiftParams): number {
  const s = y / p.h;
  const base = p.xTop + (p.xBot - p.xTop) * s + p.bow * Math.sin(Math.PI * s);
  return (
    base +
    p.amp * (0.62 * Math.sin(s * 5.3 + t * 0.19) + 0.38 * Math.sin(s * 12.1 - t * 0.31 + 1.7))
  );
}

/** Stessa funzione in GLSL: uRift = (xTop, xBot, bow, amp), uRes.y = h. */
export const RIFT_GLSL = /* glsl */ `
float riftX(float y, float t) {
  float s = y / uRes.y;
  float b = mix(uRift.x, uRift.y, s) + uRift.z * sin(3.14159265 * s);
  return b + uRift.w * (0.62 * sin(s * 5.3 + t * 0.19) + 0.38 * sin(s * 12.1 - t * 0.31 + 1.7));
}
`;

/* ---------------------------------------------------------------------------
   Il corpo dell'aurora. Tre strati, come un'aurora vera vista di taglio:
     · il bordo incandescente (la ferita di luce, quasi bianca);
     · i RAGGI: tende di luce che si allungano e si accorciano lungo la faglia
       (lunghezza modulata da rumore lento → le "colonne" dell'aurora), più
       lunghe verso lo spazio vuoto, corte verso la colonna di testo;
     · una seconda piega (ribbon) sfasata, più tenue, che dà spessore al velo;
     · un alone amplissimo che bagna tutta l'aria della sezione.
   Una banda di scintillio scorre lenta lungo la faglia. Il colore va da
   aqua-100 sul bordo, ad aqua-400 nel corpo, ad aqua-600 → abyss in lontananza:
   la luce si raffredda allontanandosi, non si spegne di colpo.
   Tutto in un solo passaggio, a mezza risoluzione (l'aurora è morbida per
   natura: 1/4 dei pixel, stessa immagine).
   ------------------------------------------------------------------------- */
export const AURORA_VERT = /* glsl */ `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const AURORA_FRAG = /* glsl */ `
precision mediump float;
uniform vec2 uRes;      // px CSS
uniform float uScale;   // px di backing per px CSS
uniform float uT;
uniform vec4 uRift;
uniform vec4 uText;     // rettangolo del testo (px CSS)
uniform vec3 uDim;      // x: fattore minimo sotto il testo, y: alpha globale, z: bias lato (+1 = raggi lunghi a destra)
uniform vec2 uCursor;   // px CSS (lontanissimo se assente)
${RIFT_GLSL}
float hash(float n) { return fract(sin(n) * 43758.5453123); }
float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash(i), hash(i + 1.0), f);
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uScale - gl_FragCoord.y) / uScale;
  float t = uT;
  float cx = riftX(p.y, t);
  float d = p.x - cx;
  float ad = abs(d);

  // i raggi sono leggermente inclinati (drappeggio): la coordinata lungo la
  // faglia scorre con la distanza, come le colonne di un'aurora vista di sbieco
  float ry = p.y - d * 0.42;
  float n1 = noise(ry * 0.03 + t * 0.3);
  float n2 = noise(ry * 0.0095 - t * 0.16 + 7.0);
  float n3 = noise(ry * 0.085 + t * 0.8 + 3.0);
  float n4 = noise(p.y * 0.052 - t * 0.46 + 11.0);

  // raggi: lunghi verso il vuoto, corti verso il testo
  float sideLong = step(0.0, d * uDim.z);
  float side = mix(0.5, 1.0, sideLong);
  float L = (40.0 + 260.0 * n2 * n2 + 90.0 * n1) * side;
  float rays = exp(-ad / L) * (0.3 + 0.7 * n1 * n1) * (0.75 + 0.25 * n3);

  // seconda piega del velo, sfasata e più sottile
  float cx2 = cx + uDim.z * (26.0 + 30.0 * sin(p.y * 0.006 + t * 0.23));
  float d2 = abs(p.x - cx2);
  float fold = exp(-d2 / (10.0 + 34.0 * n2)) * 0.34 * (0.35 + 0.65 * n4);

  // bordo incandescente + alone
  float inner = exp(-ad / 7.0) * 0.55 + exp(-ad / 26.0) * 0.32;
  float haze = exp(-ad / 320.0) * 0.12 + exp(-ad / 110.0) * 0.08;

  // scintillio che scorre lungo la faglia
  float band = 0.7 + 0.3 * sin(p.y * 0.0062 - t * 0.55) * sin(p.y * 0.0021 + t * 0.19 + 1.3);
  band += 0.18 * smoothstep(0.82, 1.0, sin(p.y * 0.013 - t * 1.1));

  float I = (rays * 0.7 + fold + inner) * band + haze;

  // il cursore "sfiora" il velo: la luce si gonfia appena
  float cd = length(p - uCursor);
  I *= 1.0 + 0.35 * exp(-cd / 140.0) * exp(-ad / 120.0);

  vec3 cCore  = vec3(0.874, 1.0, 0.972);
  vec3 c300   = vec3(0.435, 0.969, 0.871);
  vec3 c400   = vec3(0.247, 0.914, 0.800);
  vec3 c600   = vec3(0.059, 0.659, 0.561);
  vec3 cAbyss = vec3(0.040, 0.184, 0.247);
  float k = exp(-ad / 70.0);
  vec3 col = mix(cAbyss, c600, smoothstep(0.0, 0.18, k));
  col = mix(col, c400, smoothstep(0.15, 0.6, k));
  col = mix(col, c300, smoothstep(0.6, 0.95, k) * 0.7);
  col = mix(col, cCore, exp(-ad / 8.0) * 0.85);

  // attenuazione dietro al testo (contrasto AA) — rettangolo sfumato
  float fx = smoothstep(uText.x - 110.0, uText.x + 20.0, p.x) * (1.0 - smoothstep(uText.z - 20.0, uText.z + 110.0, p.x));
  float fy = smoothstep(uText.y - 110.0, uText.y + 20.0, p.y) * (1.0 - smoothstep(uText.w - 20.0, uText.w + 110.0, p.y));
  I *= mix(1.0, uDim.x, fx * fy);

  float a = clamp(I * uDim.y, 0.0, 1.0);
  gl_FragColor = vec4(col * a, a);
}
`;
