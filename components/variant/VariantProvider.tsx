"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Variant } from "@/lib/variant";

const VariantContext = createContext<Variant>("d");

/** Espone la variante (d/m) ai componenti client: `useVariant()`. */
export function VariantProvider({ variant, children }: { variant: Variant; children: ReactNode }) {
  return <VariantContext.Provider value={variant}>{children}</VariantContext.Provider>;
}

export function useVariant(): Variant {
  return useContext(VariantContext);
}

export function useIsMobileVariant(): boolean {
  return useContext(VariantContext) === "m";
}
