/**
 * Livello effetti condiviso — ART-DIRECTION v2 §3/§4/§5.
 *
 * Import puntuale consigliato (migliore tree-shaking e confini client/server
 * più chiari):
 *   import { Tilt3D } from "@/components/fx/Tilt3D";
 *
 * Questo barrel esiste per comodità quando servono più effetti insieme.
 */
export { BackgroundShader } from "./BackgroundShader";
export type { BackgroundShaderProps } from "./BackgroundShader";
/* ParticleField vive DENTRO il canvas di BackgroundShader: non montarlo da
   solo, non ha un Canvas proprio. Il tipo è esportato per configurarlo via
   <BackgroundShader particles={{ ... }} />. */
export type { ParticleFieldProps } from "./ParticleField";
export { GrainOverlay } from "./GrainOverlay";
export { CustomCursor } from "./CustomCursor";
export { SmoothScroll, getLenis, smoothScrollTo } from "./SmoothScroll";
export { TextReveal, SplitText, BlockReveal } from "./TextReveal";
export type { TextRevealProps } from "./TextReveal";
export { Magnetic } from "./Magnetic";
export type { MagneticProps } from "./Magnetic";
export { Tilt3D } from "./Tilt3D";
export type { Tilt3DProps } from "./Tilt3D";
