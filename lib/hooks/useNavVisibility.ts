"use client";

import { useEffect, useRef, useState } from "react";

/** Nav si nasconde scrollando giù velocemente, riappare scrollando su — dettaglio di reattività percepita. */
export function useNavVisibility() {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY.current;
        if (y < 80) {
          setVisible(true);
        } else if (delta > 6) {
          setVisible(false);
        } else if (delta < -6) {
          setVisible(true);
        }
        lastY.current = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return visible;
}
