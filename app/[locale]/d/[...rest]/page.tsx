import { notFound } from "next/navigation";

// Qualunque percorso non definito sotto /{locale} → 404 del sito, dentro il
// layout della variante (nav, footer, font, traduzioni).
export default function CatchAll() {
  notFound();
}
