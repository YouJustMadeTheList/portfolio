"use client";

import { useEffect, useRef, useState } from "react";

export function useInViewport<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.disconnect(); // one-shot, coerente col pattern "once: true" usato in tutti gli spec
      }
    }, options ?? { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isInView };
}
