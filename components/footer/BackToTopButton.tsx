"use client";

import { useTranslations } from "next-intl";
import { Tactile } from "@/components/ui/Tactile";
import { smoothScrollTo } from "@/components/fx/SmoothScroll";

export function BackToTopButton() {
  const t = useTranslations("footer");
  return (
    <Tactile
      as="button"
      intensity="playful"
      magnetic
      magneticMax={10}
      aria-label={t("backToTop")}
      onClick={() => smoothScrollTo(0)}
      className="relative isolate flex h-12 w-12 items-center justify-center overflow-hidden rounded-[var(--radius-full)] bg-[var(--glass)] text-[var(--text-hi)] backdrop-blur-[10px] shadow-[var(--glow-xs)] transition-colors duration-[var(--dur-base)] hover:text-[var(--aqua-300)] before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:p-px before:bg-[var(--border-gradient)] before:[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] before:[mask-composite:exclude] before:[-webkit-mask-composite:xor] hover:before:bg-[var(--border-gradient-hi)] hover:shadow-[var(--glow-sm)]"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M8 13V3M3 7l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Tactile>
  );
}

export default BackToTopButton;
