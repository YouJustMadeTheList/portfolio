"use client";

import { useRef } from "react";
import { Tactile } from "@/components/ui/Tactile";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

/**
 * Layout a scroll orizzontale con snap, usato quando N >= 4 persone (spec §3).
 * Card larghezza fissa ~280px, snap-scroll nativo (niente libreria di carousel
 * in più). Frecce hover-visibili solo desktop, in vetro con glow aqua, magnetiche
 * (ART-DIRECTION §5B); su mobile/touch è solo swipe nativo. Con
 * prefers-reduced-motion lo scroll resta nativo ma senza smooth scroll via JS
 * (spec §7).
 */
export function NetworkScrollRow({
  children,
  reducedMotion,
}: {
  children: ReactNode[];
  reducedMotion: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByCards = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = 280 + 16; // larghezza card + gap
    track.scrollBy({
      left: direction * cardWidth * 2,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <div className="group/scroll relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        style={{
          scrollBehavior: reducedMotion ? "auto" : "smooth",
          scrollSnapType: "x mandatory",
        }}
      >
        {children.map((child, i) => (
          <div key={i} className="shrink-0 snap-start" style={{ width: 280 }}>
            {child}
          </div>
        ))}
      </div>

      {/* Frecce: solo desktop (hover-visibili), niente su mobile/touch */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between md:flex">
        <Tactile
          as="button"
          intensity="subtle"
          magnetic
          magneticMax={6}
          aria-label="Scroll left"
          onClick={() => scrollByCards(-1)}
          className={cn(
            "pointer-events-auto relative isolate -translate-x-1/2 overflow-hidden rounded-[var(--radius-full)] bg-[var(--glass)] p-2.5 text-[var(--text-hi)] opacity-0 shadow-[var(--glow-xs)] backdrop-blur-[10px] transition-opacity duration-200 group-hover/scroll:opacity-100 hover:text-[var(--aqua-300)]",
          )}
        >
          <ArrowIcon direction="left" />
        </Tactile>
        <Tactile
          as="button"
          intensity="subtle"
          magnetic
          magneticMax={6}
          aria-label="Scroll right"
          onClick={() => scrollByCards(1)}
          className={cn(
            "pointer-events-auto relative isolate translate-x-1/2 overflow-hidden rounded-[var(--radius-full)] bg-[var(--glass)] p-2.5 text-[var(--text-hi)] opacity-0 shadow-[var(--glow-xs)] backdrop-blur-[10px] transition-opacity duration-200 group-hover/scroll:opacity-100 hover:text-[var(--aqua-300)]",
          )}
        >
          <ArrowIcon direction="right" />
        </Tactile>
      </div>
    </div>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: direction === "left" ? "scaleX(-1)" : undefined }}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default NetworkScrollRow;
