import { HeroMobile } from "@/components/hero/HeroMobile";
import { TrustBarMobile } from "@/components/trust-bar/TrustBarMobile";
import { ManifestoMobile } from "@/components/manifesto/ManifestoMobile";
import { CaseStudiesMobile } from "@/components/case-studies/CaseStudiesMobile";
import { MethodMobile } from "@/components/method/MethodMobile";
import { ServicesMobile } from "@/components/services/ServicesMobile";
import { AboutMobile } from "@/components/about/AboutMobile";
import { NetworkMobile } from "@/components/network/NetworkMobile";
import { ContactSection } from "@/components/contact/ContactSection";
import { StackSection } from "@/components/stack/StackSection";

/**
 * Home della variante MOBILE (servita ai telefoni da proxy.ts; i tablet
 * ricevono la desktop). Stesso ordine e stessi contenuti della desktop — Google
 * indicizza la versione mobile, quindi nessun testo può mancare qui — ma ogni
 * sezione ha la sua implementazione mobile, importata QUI direttamente: così
 * il payload della pagina mobile referenzia solo i moduli mobile e il telefono
 * non scarica il codice delle versioni desktop (carosello 3D, dealer, scene
 * WebGL complete, GSAP delle sezioni desktop). Contatti e Stack hanno il ramo
 * mobile interno, leggero. I wrapper *Section restano per la desktop.
 */
export function MobileHome() {
  return (
    <>
      <HeroMobile />
      <TrustBarMobile />
      <ManifestoMobile />
      <CaseStudiesMobile />
      <MethodMobile />
      <ServicesMobile />
      <AboutMobile />
      <NetworkMobile />
      <ContactSection />
      <StackSection />
    </>
  );
}
