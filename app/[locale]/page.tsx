import { HeroSection } from "@/components/hero/HeroSection";
import { TrustBarSection } from "@/components/trust-bar/TrustBarSection";
import { ManifestoSection } from "@/components/manifesto/ManifestoSection";
import { CaseStudiesSection } from "@/components/case-studies/CaseStudiesSection";
import { MethodSection } from "@/components/method/MethodSection";
import { ServicesSection } from "@/components/services/ServicesSection";
import { AboutSection } from "@/components/about/AboutSection";
import { NetworkSection } from "@/components/network/NetworkSection";
import { ContactSection } from "@/components/contact/ContactSection";
import { StackSection } from "@/components/stack/StackSection";

// Ordine da ARCHITECTURE.md §2: Hero → Trust Bar → Manifesto → Case Studies →
// Metodo → Servizi & Pricing → About/Traiettoria (+ 07bis Rete, opzionale) → Contatti
// → Sotto il cofano (colophon tecnico, al posto della riga "costruito con" del footer)
export default function Home() {
  return (
    <>
      <HeroSection />
      <TrustBarSection />
      <ManifestoSection />
      <CaseStudiesSection />
      <MethodSection />
      <ServicesSection />
      <AboutSection />
      <NetworkSection />
      <ContactSection />
      <StackSection />
    </>
  );
}
