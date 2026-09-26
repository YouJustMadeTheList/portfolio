"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Recupero del contesto WebGL dopo una scheda rimasta in background.
 *
 * Con la finestra aperta su un'altra pagina, il browser può revocare i
 * contesti WebGL della scheda nascosta (memoria GPU, limite di contesti, GPU
 * process riavviato). R3F non ricostruisce da sé la scena: il canvas resta
 * trasparente e gli oggetti interattivi "spariscono" al ritorno.
 *
 * Uso:
 *   const { canvasKey, onCreated } = useWebGLRecovery();
 *   <Canvas key={canvasKey} onCreated={onCreated} … />
 *
 * Alla perdita del contesto si chiama preventDefault (permette il ripristino);
 * al ripristino — o al ritorno in primo piano con il contesto ancora perso —
 * il Canvas viene rimontato con una chiave nuova, cioè con scena e shader
 * ricreati da zero.
 */
export function useWebGLRecovery() {
  const [canvasKey, setCanvasKey] = useState(0);
  const lostRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const remount = useCallback(() => {
    lostRef.current = false;
    setCanvasKey((k) => k + 1);
  }, []);

  const onCreated = useCallback(
    ({ gl }: { gl: { domElement: HTMLCanvasElement; getContext: () => WebGLRenderingContext | WebGL2RenderingContext } }) => {
      cleanupRef.current?.();
      const canvas = gl.domElement;
      const onLost = (e: Event) => {
        e.preventDefault();
        lostRef.current = true;
      };
      const onRestored = () => remount();
      canvas.addEventListener("webglcontextlost", onLost, false);
      canvas.addEventListener("webglcontextrestored", onRestored, false);
      cleanupRef.current = () => {
        canvas.removeEventListener("webglcontextlost", onLost, false);
        canvas.removeEventListener("webglcontextrestored", onRestored, false);
      };
    },
    [remount],
  );

  useEffect(() => {
    const onVis = () => {
      if (!document.hidden && lostRef.current) remount();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      cleanupRef.current?.();
    };
  }, [remount]);

  return { canvasKey, onCreated };
}
