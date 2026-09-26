import { notFound } from "next/navigation";

// Catch-all sotto /{locale}: qualunque percorso non definito (es. /it/pippo)
// lancia notFound(), così la 404 viene resa da app/[locale]/not-found.tsx
// DENTRO il layout di locale — con nav, footer, font e traduzioni giuste.
// Le rotte statiche sorelle (privacy, cookie, …) hanno la precedenza sul
// catch-all e non ne sono toccate.
export default function CatchAll() {
  notFound();
}
