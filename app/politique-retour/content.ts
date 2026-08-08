import type { Lang, LegalContent } from "../_components/LegalPage";

export const RETURN_POLICY: Record<Lang, LegalContent> = {
  fr: {
    eyebrow: "Maison Amélia Ruby",
    title: "Politique de retour et garantie",
    updated: "8 août 2026",
    intro: [
      "Chaque pièce quitte l'atelier après une inspection minutieuse. Si votre achat ne vous convient pas, voici les conditions dans lesquelles nous acceptons un retour, ainsi que la portée de la garantie qui accompagne nos sacs.",
    ],
    sections: [
      {
        heading: "Délai pour demander un retour",
        paragraphs: [
          "Si votre achat ne vous convient pas, vous disposez de 7 jours suivant la réception de votre commande pour demander un retour.",
        ],
      },
      {
        heading: "État du produit",
        paragraphs: [
          "Le produit doit être non utilisé, non porté et dans son état d'origine, avec ses accessoires et son emballage.",
        ],
      },
      {
        heading: "Frais de retour et remboursement",
        paragraphs: [
          "Les frais de retour sont à la charge du client. Une fois le produit reçu et inspecté, le remboursement sera effectué si toutes les conditions de retour sont respectées.",
        ],
      },
      {
        heading: "Garantie de 6 mois",
        paragraphs: [
          "Nos sacs bénéficient également d'une garantie de 6 mois contre les défauts de fabrication. Cette garantie ne couvre pas l'usure normale, les frottements, les égratignures, les taches ou les dommages causés par l'utilisation ou un entretien inadéquat.",
        ],
      },
      {
        heading: "Achats effectués chez un détaillant",
        paragraphs: [
          "Pour tout achat effectué auprès de l'un de nos détaillants, la politique de retour du détaillant s'applique.",
        ],
      },
      {
        heading: "Comment procéder",
        callout:
          "« Avant tout retour, veuillez communiquer avec nous afin d'obtenir les instructions de retour. »",
      },
    ],
    contactTitle: "Une question sur un retour ?",
    contactText:
      "Écrivez-nous en précisant votre numéro de commande et la raison du retour. Nous vous transmettrons les instructions à suivre.",
  },
  en: {
    eyebrow: "Maison Amélia Ruby",
    title: "Return & Warranty Policy",
    updated: "August 8, 2026",
    intro: [
      "Every piece leaves the atelier after a careful inspection. If your purchase is not right for you, here are the conditions under which we accept a return, along with the scope of the warranty that comes with our bags.",
    ],
    sections: [
      {
        heading: "Time frame to request a return",
        paragraphs: [
          "If your purchase is not right for you, you have 7 days following receipt of your order to request a return.",
        ],
      },
      {
        heading: "Condition of the product",
        paragraphs: [
          "The product must be unused, unworn and in its original condition, with its accessories and packaging.",
        ],
      },
      {
        heading: "Return shipping costs and refund",
        paragraphs: [
          "Return shipping costs are the customer's responsibility. Once the product has been received and inspected, the refund will be issued if all return conditions are met.",
        ],
      },
      {
        heading: "6-month warranty",
        paragraphs: [
          "Our bags also come with a 6-month warranty against manufacturing defects. This warranty does not cover normal wear, rubbing, scratches, stains, or damage caused by use or inadequate care.",
        ],
      },
      {
        heading: "Purchases made from a retailer",
        paragraphs: [
          "For any purchase made from one of our retailers, the retailer's return policy applies.",
        ],
      },
      {
        heading: "How to proceed",
        callout:
          "“Before any return, please contact us to obtain the return instructions.”",
      },
    ],
    contactTitle: "A question about a return?",
    contactText:
      "Write to us with your order number and the reason for the return, and we will send you the instructions to follow.",
  },
};
