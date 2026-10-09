import type { ReactNode } from "react";

/* Marcatura dell'enfasi serif-italic aqua nei titoli. Vive in un modulo a sé
   (senza TextReveal né GSAP) così chi serve solo il parsing, come la pagina 404,
   non si trascina dietro la libreria di animazione. SectionHeader li riesporta. */

/** Enfasi serif-italic aqua. Usare dentro un titolo, su UNA sola frase. */
export function Em({ children }: { children: ReactNode }) {
  return <span className="serif-accent">{children}</span>;
}

/** Converte "testo ⟨enfasi⟩ testo" (o *enfasi*) in nodi con <Em>. */
export function parseEmphasis(text: string): ReactNode {
  const parts = text.split(/(⟨[^⟩]+⟩|\*[^*]+\*)/g).filter(Boolean);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    const isEm =
      (part.startsWith("⟨") && part.endsWith("⟩")) ||
      (part.startsWith("*") && part.endsWith("*") && part.length > 2);
    return isEm ? (
      <Em key={i}>{part.slice(1, -1)}</Em>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}
