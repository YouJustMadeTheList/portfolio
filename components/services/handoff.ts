import { smoothScrollTo } from "@/components/fx/scrollTo";
import {
  PACKAGE_TO_PROJECT_TYPE,
  SERVICES_HANDOFF_KEY,
  type ServicePackageId,
} from "@/content/services";

/**
 * Handoff Servizi → Contatti, condiviso da ServicesSection (desktop) e
 * ServicesMobile: UNA sola implementazione, così le due varianti non possono
 * divergere. Contratto documentato in content/services.ts accanto a
 * SERVICES_HANDOFF_KEY — NON RINOMINARE la chiave né il nome/shape
 * dell'evento: il consumer vive in components/contact/ContactForm.tsx.
 *
 *   1. localStorage[SERVICES_HANDOFF_KEY] = projectType
 *   2. CustomEvent("servizi:project-type-selected", { detail: { projectType, packageId } })
 *   3. scroll a #contatti (Lenis su desktop, nativo sul mobile — smoothScrollTo
 *      sceglie da sé)
 */
export function handOffToContact(packageId: ServicePackageId) {
  const projectType = PACKAGE_TO_PROJECT_TYPE[packageId];

  try {
    window.localStorage.setItem(SERVICES_HANDOFF_KEY, projectType);
  } catch {
    // localStorage indisponibile (privacy mode, ecc.) — non bloccante,
    // il CustomEvent sotto resta il canale primario per un consumer già montato.
  }

  window.dispatchEvent(
    new CustomEvent("servizi:project-type-selected", {
      detail: { projectType, packageId },
    }),
  );

  smoothScrollTo("#contatti");
}
