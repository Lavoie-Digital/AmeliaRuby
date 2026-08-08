import type { Metadata } from "next";
import LegalPage from "../_components/LegalPage";
import { PRIVACY_POLICY } from "./content";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Comment la Maison Amélia Ruby recueille, utilise, protège et conserve vos renseignements personnels, conformément à la Loi 25 du Québec et à la LPRPDE.",
  alternates: {
    canonical: "/politique-confidentialite",
  },
  openGraph: {
    title: "Politique de confidentialité — Amélia Ruby",
    description:
      "Renseignements recueillis, finalités, prestataires, durée de conservation et vos droits.",
    url: "/politique-confidentialite",
  },
};

export default function Page() {
  return <LegalPage content={PRIVACY_POLICY} current="privacy" />;
}
