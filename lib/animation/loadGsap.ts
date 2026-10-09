/**
 * Caricamento differito di GSAP (+ ScrollTrigger registrato).
 *
 * I componenti che servono GSAP solo DOPO l'idratazione (reveal del footer,
 * Lenis) lo importano da qui invece che staticamente: sulle pagine di
 * contenuto, dove nient'altro lo usa, la libreria esce dal JS di avvio e viene
 * scaricata solo quando serve. Dove GSAP è già nel bundle (home) la promessa si
 * risolve dal chunk già presente, senza una richiesta in più.
 */
let pending: Promise<typeof import("./gsap")> | null = null;

export function loadGsap(): Promise<typeof import("./gsap")> {
  if (!pending) pending = import("./gsap");
  return pending;
}
