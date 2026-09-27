"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { networkPeople, type NetworkPerson } from "@/content/network";
import { SHOW_NETWORK_SECTION } from "@/config/features";
import { networkCopy } from "./networkCopy";

/**
 * 07bis RETE — variante MOBILE (telefoni).
 *
 * GATING IDENTICO alla desktop (SHOW_NETWORK_SECTION + consentObtained per
 * persona): senza almeno una persona con consenso la sezione non monta.
 *
 * Con 1 persona: una card a tutta larghezza. Con 2+: striscia orizzontale con
 * snap nativo (card all'84% così la successiva si intravede), contatore e
 * trattini di posizione. Nessun Tilt3D/Tactile/BlockReveal: card statiche,
 * link con bersaglio ≥ 44px.
 */
export function NetworkMobile() {
  if (!SHOW_NETWORK_SECTION) return null;
  const visible = networkPeople.filter((p) => p.consentObtained === true);
  if (visible.length === 0) return null;
  return <NetworkMobileView people={visible} />;
}

/** Vista pura: riceve persone GIÀ filtrate per consenso. */
export function NetworkMobileView({ people }: { people: NetworkPerson[] }) {
  const locale = useLocale() as "it" | "en";
  const t = networkCopy[locale];
  const n = people.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || n < 2) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const first = track.firstElementChild as HTMLElement | null;
        const step = first ? first.offsetWidth + 12 : track.clientWidth;
        setActive(Math.min(n - 1, Math.max(0, Math.round(track.scrollLeft / Math.max(step, 1)))));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [n]);

  return (
    <section id="rete" className="section-padding relative overflow-x-clip">
      <span
        aria-hidden="true"
        className="aurora"
        style={{ top: "6%", left: "-30%", width: "100vw", height: "50vh", background: "var(--aurora-deep)", opacity: 0.3 }}
      />
      <Container className="relative">
        <SectionHeader eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />

        {n > 1 ? (
          <p className="mt-8 text-right font-[family-name:var(--font-mono)] text-[12px] tracking-[0.1em] tabular-nums text-[var(--text-low)]">
            <span className="text-[var(--aqua-300)]">{String(active + 1).padStart(2, "0")}</span> /{" "}
            {String(n).padStart(2, "0")}
          </p>
        ) : null}

        <div
          ref={trackRef}
          className={
            n > 1
              ? "nm-strip -mx-5 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2"
              : "mt-8"
          }
          style={n > 1 ? { scrollPaddingInline: 20, scrollbarWidth: "none", overscrollBehaviorX: "contain" } : undefined}
        >
          {people.map((p) => (
            <div key={p.id} className={n > 1 ? "w-[84%] shrink-0 snap-start" : "w-full"}>
              <PersonCardMobile
                name={p.name}
                context={locale === "it" ? p.contextIt : p.contextEn}
                publicUrl={p.publicUrl}
                publicUrlLabel={p.publicUrl ? p.publicUrlLabel?.[locale] : undefined}
              />
            </div>
          ))}
        </div>

        {n > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden="true">
            {people.map((p, i) => (
              <span
                key={p.id}
                className="block h-[3px] w-[18px] rounded-full bg-[var(--aqua-400)] transition-[opacity,transform] duration-300"
                style={{ opacity: i === active ? 0.9 : 0.2, transform: `scaleX(${i === active ? 1 : 0.5})` }}
              />
            ))}
          </div>
        ) : null}
      </Container>
      <style dangerouslySetInnerHTML={{ __html: ".nm-strip::-webkit-scrollbar{display:none}" }} />
    </section>
  );
}

function PersonCardMobile({
  name,
  context,
  publicUrl,
  publicUrlLabel,
}: {
  name: string;
  context: string;
  publicUrl?: string;
  publicUrlLabel?: string;
}) {
  return (
    <div className="glass-surface flex h-full flex-col gap-1.5 p-5">
      <p className="font-[family-name:var(--font-display)] text-[17px] font-medium text-[var(--text-hi)]">{name}</p>
      <p className="text-[14px] leading-[1.5] text-[var(--text-mid)]">{context}</p>
      {publicUrl ? (
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto inline-flex min-h-[44px] w-fit items-center gap-1 text-[14px] text-[var(--aqua-300)] underline decoration-[var(--accent-dim)] underline-offset-[3px]"
        >
          {publicUrlLabel ?? "→"}
        </a>
      ) : null}
    </div>
  );
}

export default NetworkMobile;
