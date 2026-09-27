import { setRequestLocale } from "next-intl/server";
import { MobileHome } from "@/components/mobile/MobileHome";

type Props = { params: Promise<{ locale: string }> };

/* Home della variante mobile: solo sezioni mobile (vedi MobileHome). */
export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MobileHome />;
}
