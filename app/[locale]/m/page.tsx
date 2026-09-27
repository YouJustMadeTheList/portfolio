import { setRequestLocale } from "next-intl/server";
import { homeMetadata, HomeJsonLd } from "@/components/site/HomeSeo";
import { MobileHome } from "@/components/mobile/MobileHome";

export const generateMetadata = homeMetadata;

type Props = { params: Promise<{ locale: string }> };

/* Home della variante mobile: solo sezioni mobile (vedi MobileHome). */
export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <HomeJsonLd locale={locale} />
      <MobileHome />
    </>
  );
}
