"use client";

import type { ReactNode } from "react";
import { Tactile } from "./Tactile";
import { cn } from "@/lib/utils/cn";

/**
 * Bottone del sistema v2 (ART-DIRECTION §1 "l'aqua è luce, non vernice", §3 L5, §5).
 *
 * - `primary`   : riempimento aqua su testo void + glow che cresce in hover.
 *                 È l'UNICA superficie del sito che può essere piena di aqua.
 * - `secondary` : vetro + bordo a gradiente illuminato, testo chiaro.
 * - `ghost`     : solo testo mono con trattino aqua, per le azioni terziarie.
 *
 * Tutti e tre sono A′+B+D: NON molleggiano (ART-DIRECTION §5 — "no tremolio su
 * aree di click": un bersaglio che ruota sotto il cursore si manca), ma si
 * sollevano di pochi px e si illuminano all'hover, sono magnetici durante
 * l'hover e si schiacciano al click.
 *
 * Il `wobble` NON viene passato: `Tactile` deriva da sé che un `button`/`a` è
 * interattivo e sceglie la risposta calma. Non reintrodurlo.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  href?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

const SIZES: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-[0.8125rem]",
  md: "px-6 py-3 text-[0.9rem]",
  lg: "px-8 py-4 text-[0.98rem]",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: [
    "text-[var(--void)] font-medium",
    "bg-[linear-gradient(135deg,var(--aqua-300),var(--aqua-500))]",
    "shadow-[var(--glow-sm)]",
    "hover:shadow-[var(--glow-md)]",
    "hover:brightness-[1.06]",
  ].join(" "),
  secondary: [
    "text-[var(--text-hi)]",
    "bg-[var(--surface-glass)] backdrop-blur-[12px]",
    "shadow-[var(--shadow-glass)]",
    "hover:shadow-[var(--shadow-glass-hover)]",
    "hover:text-[var(--aqua-100)]",
    // bordo a gradiente via pseudo-elemento mascherato
    "before:absolute before:inset-0 before:rounded-[inherit] before:p-px before:pointer-events-none",
    "before:bg-[var(--border-gradient)]",
    "before:[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)]",
    "before:[mask-composite:exclude] before:[-webkit-mask-composite:xor]",
    "before:transition-[background] before:duration-300",
    "hover:before:bg-[var(--border-gradient-hi)]",
  ].join(" "),
  ghost: [
    "font-[family-name:var(--font-mono)] uppercase tracking-[var(--ls-micro)]",
    "text-[var(--text-mid)] hover:text-[var(--aqua-300)]",
    "px-0",
  ].join(" "),
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  onClick,
  type = "button",
  href,
  target,
  rel,
  disabled,
  ...aria
}: ButtonProps) {
  const base = cn(
    "group relative isolate inline-flex select-none items-center justify-center gap-2",
    "rounded-[var(--radius-full)] leading-none",
    "transition-[color,background,box-shadow,filter] duration-[var(--dur-base)] ease-[var(--ease-out)]",
    "disabled:pointer-events-none disabled:opacity-40",
    variant !== "ghost" && SIZES[size],
    VARIANTS[variant],
    className,
  );

  return (
    <Tactile
      as={href ? "a" : "button"}
      href={href}
      target={target}
      rel={rel}
      type={href ? undefined : type}
      onClick={onClick}
      disabled={disabled}
      intensity="default"
      magnetic
      squash
      magneticMax={variant === "ghost" ? 8 : 12}
      className={base}
      {...aria}
    >
      {children}
    </Tactile>
  );
}

export default Button;
