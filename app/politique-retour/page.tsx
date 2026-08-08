import type { Metadata } from "next";
import LegalPage from "../_components/LegalPage";
import { RETURN_POLICY } from "./content";

export const metadata: Metadata = {
  title: "Politique de retour et garantie",
  description:
    "Conditions de retour des sacs Amélia Ruby : 7 jours suivant la réception, produit non utilisé et dans son emballage d'origine, frais de retour à la charge du client, et garantie de 6 mois contre les défauts de fabrication.",
  alternates: {
    canonical: "/politique-retour",
  },
  openGraph: {
    title: "Politique de retour et garantie — Amélia Ruby",
    description:
      "Retours acceptés dans les 7 jours suivant la réception. Garantie de 6 mois contre les défauts de fabrication.",
    url: "/politique-retour",
  },
};

export default function Page() {
  return <LegalPage content={RETURN_POLICY} current="returns" />;
}
