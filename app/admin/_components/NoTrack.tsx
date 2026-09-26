"use client";

import { useEffect } from "react";
import { NOTRACK_KEY } from "@/lib/analytics/consent";

/** Esclude dalle statistiche il browser di chi usa il pannello. */
export function NoTrack() {
  useEffect(() => {
    try {
      localStorage.setItem(NOTRACK_KEY, "1");
    } catch {
      /* storage non disponibile */
    }
  }, []);
  return null;
}
