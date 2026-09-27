/**
 * Sonda GPU condivisa — UNA sola volta per pagina.
 *
 * Prima ogni effetto (fondo, hero, manifesto) creava il suo contesto WebGL
 * "di prova": tre contesti buttati, e il primo paga l'avvio del processo GPU.
 * Qui il risultato è in cache per tutta la sessione.
 *
 * `software`: il browser disegna WebGL SENZA scheda grafica (SwiftShader,
 * llvmpipe, "Microsoft Basic Render Driver"…). Succede su macchine virtuali,
 * desktop remoti, driver in blocklist — e nei test automatici (Lighthouse /
 * PageSpeed Insights girano così). Lì compilare uno shader costa centinaia di
 * ms di thread principale bloccato e ogni frame è un'eternità: la pagina
 * userebbe le versioni leggere già esistenti (fallback 2D della rete, fondo
 * statico, velo d'aurora CSS) invece di diventare una moviola.
 * Con una GPU vera (la quasi totalità dei visitatori) non cambia nulla.
 *
 * Override manuale per verifiche: `?gfx=full` o `?gfx=lite` nell'URL.
 */
export type GpuProfile = { webgl: boolean; software: boolean; renderer: string };

let cached: GpuProfile | null = null;
let pending: Promise<GpuProfile> | null = null;

const SOFTWARE_RE = /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render|mesa offscreen/i;

function applyOverride(p: GpuProfile): GpuProfile {
  try {
    const force = new URLSearchParams(window.location.search).get("gfx");
    if (force === "full") return { ...p, software: false };
    if (force === "lite") return { ...p, software: true };
  } catch {
    /* URL non leggibile: si tiene la sonda */
  }
  return p;
}

function readRenderer(gl: WebGLRenderingContext): string {
  let r = String(gl.getParameter(gl.RENDERER) || "");
  // Chrome/Safari espongono il renderer reale solo tramite l'estensione
  if (!r || /^webkit webgl$/i.test(r)) {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (ext) r = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || r);
  }
  return r;
}

function probeSync(): GpuProfile {
  let webgl = false;
  let renderer = "";
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (gl) {
      webgl = true;
      renderer = readRenderer(gl);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    webgl = false;
  }
  return { webgl, software: SOFTWARE_RE.test(renderer), renderer };
}

/** Sonda sincrona (thread principale). Preferire `probeGpuAsync`. */
export function probeGpu(): GpuProfile {
  if (!cached) cached = applyOverride(probeSync());
  return cached;
}

/* Il primo contesto WebGL della pagina avvia il processo GPU: con un
   renderer software costa centinaia di ms. La sonda asincrona lo crea in un
   Worker (OffscreenCanvas), FUORI dal thread principale: la pagina resta
   reattiva mentre la GPU si sveglia. Dove Worker/OffscreenCanvas mancano, o
   il worker non ha WebGL, si ripiega sulla sonda sincrona. */
const WORKER_SRC = `self.onmessage=function(){var r={webgl:false,renderer:""};try{var c=new OffscreenCanvas(1,1);var gl=c.getContext("webgl2")||c.getContext("webgl");if(gl){r.webgl=true;var s=String(gl.getParameter(gl.RENDERER)||"");if(!s||/^webkit webgl$/i.test(s)){var e=gl.getExtension("WEBGL_debug_renderer_info");if(e)s=String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)||s);}r.renderer=s;var l=gl.getExtension("WEBGL_lose_context");if(l)l.loseContext();}}catch(x){}self.postMessage(r);};`;

export function probeGpuAsync(): Promise<GpuProfile> {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = new Promise<GpuProfile>((resolve) => {
    let settled = false;
    const done = (p: GpuProfile) => {
      if (settled) return;
      settled = true;
      if (!cached) cached = applyOverride(p);
      resolve(cached);
    };
    if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
      done(probeSync());
      return;
    }
    try {
      const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
      const worker = new Worker(url);
      const finish = () => {
        window.clearTimeout(timer);
        worker.terminate();
        URL.revokeObjectURL(url);
      };
      const timer = window.setTimeout(() => {
        finish();
        done(probeSync());
      }, 5000);
      worker.onmessage = (e: MessageEvent<{ webgl: boolean; renderer: string }>) => {
        finish();
        const d = e.data;
        if (!d || !d.webgl) done(probeSync());
        else done({ webgl: true, software: SOFTWARE_RE.test(d.renderer), renderer: d.renderer });
      };
      worker.onerror = () => {
        finish();
        done(probeSync());
      };
      worker.postMessage(0);
    } catch {
      done(probeSync());
    }
  });
  return pending;
}

/** WebGL presente E accelerato: le scene ricche partono solo qui. */
export function hasRichWebGL(): boolean {
  const g = probeGpu();
  return g.webgl && !g.software;
}

/** Come `hasRichWebGL`, ma senza bloccare il thread principale. */
export async function hasRichWebGLAsync(): Promise<boolean> {
  const g = await probeGpuAsync();
  return g.webgl && !g.software;
}
