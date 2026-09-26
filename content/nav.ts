// Struttura e ordine delle 5 voci di nav (le label vere sono in messages/*.json).
// Vedi specs/00-global-nav-footer-design-system.md B.7.
export type SectionId = "progetti" | "metodo" | "servizi" | "about" | "contatti";

export const navSections: { id: SectionId; messageKey: SectionId }[] = [
  { id: "progetti", messageKey: "progetti" },
  { id: "metodo", messageKey: "metodo" },
  { id: "servizi", messageKey: "servizi" },
  { id: "about", messageKey: "about" },
  { id: "contatti", messageKey: "contatti" },
];
