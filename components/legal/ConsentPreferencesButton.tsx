"use client";

import { useEffect, useState } from "react";
import { readConsent, type ConsentState } from "@/lib/analytics/consent";
import type { ConsentCopy } from "@/content/legal";

/** Bottone nella cookie policy: riapre le preferenze e mostra lo stato attuale. */
export function ConsentPreferencesButton({ copy }: { copy: ConsentCopy }) {
  const [state, setState] = useState<ConsentState | null>(null);

  useEffect(() => {
    const sync = () => setState(readConsent());
    sync();
    window.addEventListener("consent:change", sync);
    return () => window.removeEventListener("consent:change", sync);
  }, []);

  const status =
    state === "granted" ? copy.statusGranted : state === "denied" ? copy.statusDenied : state === "unset" ? copy.statusUnset : " ";

  return (
    <div className="my-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("consent:open"))}
        className="inline-flex min-h-11 items-center gap-2.5 rounded-full border border-[var(--line-hi)] bg-[rgb(var(--aqua-rgb)/0.08)] px-5 text-[14px] font-medium text-[var(--text-hi)] transition-[transform,filter,background-color,box-shadow] duration-[220ms] ease-[var(--ease-out)] hover:bg-[rgb(var(--aqua-rgb)/0.16)] hover:shadow-[var(--glow-xs)] hover:brightness-110 motion-safe:hover:-translate-y-[2px] active:scale-[0.97]"
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--aqua-400)] shadow-[var(--glow-xs)]" />
        {copy.consentButton}
      </button>
      <p aria-live="polite" className="font-[family-name:var(--font-mono)] text-[11.5px] tracking-[0.04em] text-[var(--text-low)]">
        {status}
      </p>
    </div>
  );
}
