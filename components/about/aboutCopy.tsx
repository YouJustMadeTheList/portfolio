import type { ReactNode } from "react";

/* Header e helper condivisi da AboutSection (desktop) e AboutMobile. */

export const aboutHeader = {
  it: {
    eyebrow: "Traiettoria",
    title: "Due binari, ⟨non due fasi⟩.",
    subtitle:
      "Sviluppo e IA nascono al liceo. Il lavoro con i clienti, l'azienda, il Politecnico — oggi procedono in parallelo.",
  },
  en: {
    eyebrow: "Trajectory",
    title: "Two tracks, ⟨not two phases⟩.",
    subtitle:
      "Development and AI started in high school. Client work, my own company, the Politecnico — today they run in parallel.",
  },
};

/** Avvolge una sottostringa esatta in serif-italic aqua, lasciando intatto il copy. */
export function withEmphasis(text: string, phrase: string): ReactNode {
  const at = phrase ? text.indexOf(phrase) : -1;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className="serif-accent">{phrase}</span>
      {text.slice(at + phrase.length)}
    </>
  );
}
