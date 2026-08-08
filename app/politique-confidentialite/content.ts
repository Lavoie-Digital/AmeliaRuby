import type { Lang, LegalContent } from "../_components/LegalPage";

export const PRIVACY_POLICY: Record<Lang, LegalContent> = {
  fr: {
    eyebrow: "Maison Amélia Ruby",
    title: "Politique de confidentialité",
    updated: "8 août 2026",
    intro: [
      "La Maison Amélia Ruby (« Amélia Ruby », « nous ») accorde à vos renseignements personnels le même soin qu'à ses cuirs. La présente politique explique quels renseignements nous recueillons sur ameliaruby.com, pourquoi nous les recueillons, à qui nous les confions, combien de temps nous les conservons et quels sont vos droits.",
      "Elle est rédigée conformément à la Loi sur la protection des renseignements personnels dans le secteur privé du Québec, telle que modernisée par la Loi 25, et à la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) du Canada.",
    ],
    sections: [
      {
        heading: "Responsable de la protection des renseignements personnels",
        paragraphs: [
          "La personne responsable de la protection des renseignements personnels au sein de la Maison Amélia Ruby est joignable par courriel à info@ameliaruby.com. La maison est établie à Montréal, au Québec.",
          "Toute question, demande d'accès, de rectification ou de retrait de consentement doit être adressée à cette adresse.",
        ],
      },
      {
        heading: "Renseignements que nous recueillons",
        paragraphs: [
          "Nous ne recueillons que les renseignements nécessaires aux fins décrites plus bas :",
        ],
        bullets: [
          "Identité et coordonnées : nom, adresse courriel, numéro de téléphone.",
          "Livraison et facturation : adresse, ville, province ou état, code postal, pays.",
          "Détails de commande : pièces commandées, montants, taxes, frais de livraison, code promotionnel utilisé, numéro de commande et numéro de suivi.",
          "Communications : le contenu des messages que vous nous transmettez par le formulaire de contact ou par l'assistante de la boutique.",
          "Atelier sur mesure : la description que vous rédigez pour faire générer une esquisse, ainsi que l'esquisse produite.",
          "Renseignements techniques : adresse IP, type de navigateur et d'appareil, pages consultées — utilisés uniquement pour la sécurité du site et la limitation des abus.",
        ],
        callout:
          "Nous ne recueillons jamais volontairement de renseignements sensibles (santé, origines, convictions, données biométriques), et nous ne vendons, ne louons ni n'échangeons vos renseignements avec qui que ce soit.",
      },
      {
        heading: "Renseignements de paiement",
        paragraphs: [
          "Les paiements sont traités par Square, un prestataire de paiement certifié PCI-DSS. Les données de votre carte sont saisies directement dans l'environnement sécurisé de Square : elles ne transitent pas par nos serveurs et nous n'y avons jamais accès.",
          "Nous recevons uniquement les renseignements nécessaires au suivi de la transaction — confirmation du paiement, montant, devise, statut et référence de la commande. Le traitement effectué par Square est également régi par sa propre politique de confidentialité.",
        ],
      },
      {
        heading: "Fins auxquelles nous utilisons vos renseignements",
        bullets: [
          "Traiter, préparer et expédier vos commandes, et percevoir les taxes applicables.",
          "Vous informer de l'état de votre commande : confirmation, expédition, numéro de suivi.",
          "Répondre à vos questions et assurer le service après-vente, les retours et la garantie.",
          "Générer, à votre demande, une esquisse de création sur mesure et en discuter avec vous.",
          "Prévenir la fraude et les abus, et assurer la sécurité du site.",
          "Respecter nos obligations légales, fiscales et comptables.",
          "Avec votre consentement, vous transmettre des nouvelles de la maison — consentement que vous pouvez retirer en tout temps.",
        ],
        afterBullets: [
          "Nous n'utilisons pas vos renseignements pour rendre une décision fondée exclusivement sur un traitement automatisé, ni pour vous profiler.",
        ],
      },
      {
        heading: "Consentement",
        paragraphs: [
          "En passant une commande, en nous écrivant ou en utilisant l'atelier sur mesure, vous consentez à ce que nous utilisions vos renseignements aux fins énoncées ci-dessus. Ce consentement est manifeste, libre et donné à des fins précises.",
          "Vous pouvez le retirer en tout temps en nous écrivant. Notez toutefois que certains renseignements demeurent nécessaires pour exécuter une commande en cours, honorer la garantie ou respecter une obligation légale de conservation.",
        ],
      },
      {
        heading: "Prestataires à qui nous confions des renseignements",
        paragraphs: [
          "Nous faisons appel à un nombre limité de prestataires, qui n'ont accès qu'aux renseignements strictement nécessaires à leur prestation et qui sont liés par leurs propres engagements de confidentialité :",
        ],
        bullets: [
          "Square — traitement des paiements et facturation.",
          "Google Firebase (Firestore) — hébergement de la base de données des commandes, de l'inventaire et des suivis.",
          "SendGrid (Twilio) — envoi des courriels transactionnels : confirmation, expédition, réponse à vos messages.",
          "Google (Gemini) — génération des esquisses de l'atelier sur mesure, à partir de la description que vous rédigez.",
          "Notre fournisseur d'hébergement web — exploitation technique du site ameliaruby.com.",
          "Les transporteurs (Postes Canada et autres selon la destination) — livraison de votre commande et suivi du colis.",
        ],
      },
      {
        heading: "Communication de renseignements à l'extérieur du Québec",
        paragraphs: [
          "Certains de ces prestataires conservent ou traitent des renseignements à l'extérieur du Québec, notamment aux États-Unis. Avant de leur confier des renseignements, nous avons évalué que la protection offerte est adéquate, compte tenu de leur engagement contractuel de confidentialité, des mesures de sécurité en place et de la sensibilité limitée des renseignements en cause.",
          "Vous pouvez nous écrire pour obtenir plus de détails au sujet de cette évaluation.",
        ],
      },
      {
        heading: "Témoins (cookies) et stockage local",
        paragraphs: [
          "Le site n'utilise aucun témoin publicitaire, aucun traceur de réseau social et aucun outil de profilage à des fins de marketing.",
          "Nous utilisons uniquement le stockage local de votre navigateur pour retenir votre choix de langue et le contenu de votre panier. Ces informations restent sur votre appareil et vous pouvez les effacer en tout temps en supprimant les données du site dans les réglages de votre navigateur.",
        ],
      },
      {
        heading: "Durée de conservation",
        bullets: [
          "Renseignements liés à une commande : conservés le temps nécessaire à la garantie et au respect de nos obligations fiscales et comptables, soit jusqu'à sept ans.",
          "Messages reçus par le formulaire de contact : au plus vingt-quatre mois.",
          "Descriptions et esquisses de l'atelier sur mesure : conservées seulement le temps de l'échange avec vous, sauf si elles servent à préparer une commande sur mesure.",
          "Renseignements techniques utilisés pour la limitation des abus : quelques heures à quelques jours, puis supprimés automatiquement.",
        ],
        afterBullets: [
          "Une fois ces délais écoulés, les renseignements sont détruits ou anonymisés.",
        ],
      },
      {
        heading: "Sécurité",
        paragraphs: [
          "Les échanges avec le site sont chiffrés (HTTPS/TLS). L'accès aux commandes et aux renseignements des clientes et clients est restreint aux personnes qui en ont besoin, et la section d'administration est protégée par authentification.",
          "Aucun système n'est infaillible. En cas d'incident de confidentialité présentant un risque de préjudice sérieux, nous vous en informerions et aviserions la Commission d'accès à l'information du Québec, comme la loi l'exige.",
        ],
      },
      {
        heading: "Vos droits",
        paragraphs: ["Vous avez le droit :"],
        bullets: [
          "D'accéder aux renseignements personnels que nous détenons à votre sujet.",
          "De les faire rectifier s'ils sont inexacts, incomplets ou équivoques.",
          "De retirer votre consentement et de demander que nous cessions de les utiliser.",
          "De demander la suppression d'un renseignement dont la conservation n'est plus nécessaire.",
          "De recevoir, dans un format technologique structuré et couramment utilisé, les renseignements que vous nous avez fournis.",
        ],
        callout:
          "Écrivez à info@ameliaruby.com pour exercer l'un de ces droits : nous répondons dans les trente jours. Si notre réponse ne vous satisfait pas, vous pouvez porter plainte auprès de la Commission d'accès à l'information du Québec (cai.gouv.qc.ca) ou du Commissariat à la protection de la vie privée du Canada.",
      },
      {
        heading: "Mineurs",
        paragraphs: [
          "Le site s'adresse à une clientèle adulte. Nous ne recueillons pas sciemment de renseignements auprès d'une personne de moins de quatorze ans sans le consentement de son titulaire de l'autorité parentale. Si un tel renseignement nous a été transmis, écrivez-nous et nous le supprimerons.",
        ],
      },
      {
        heading: "Modifications de la présente politique",
        paragraphs: [
          "Nous pouvons modifier cette politique afin de refléter une évolution de nos pratiques ou du cadre légal. La version en vigueur est toujours celle publiée sur cette page, et la date de mise à jour figure en haut du document.",
        ],
      },
    ],
    contactTitle: "Nous joindre",
    contactText:
      "Pour toute question relative à la protection de vos renseignements personnels, ou pour exercer vos droits, écrivez à la personne responsable de la protection des renseignements personnels.",
  },
  en: {
    eyebrow: "Maison Amélia Ruby",
    title: "Privacy Policy",
    updated: "August 8, 2026",
    intro: [
      "Maison Amélia Ruby (“Amélia Ruby”, “we”) treats your personal information with the same care as its leathers. This policy explains what information we collect on ameliaruby.com, why we collect it, who we entrust it to, how long we keep it, and what your rights are.",
      "It is written in accordance with Quebec's Act respecting the protection of personal information in the private sector, as modernized by Law 25, and with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA).",
    ],
    sections: [
      {
        heading: "Privacy officer",
        paragraphs: [
          "The person responsible for the protection of personal information at Maison Amélia Ruby can be reached by email at info@ameliaruby.com. The house is based in Montreal, Quebec.",
          "Any question, or any request for access, correction or withdrawal of consent, should be sent to that address.",
        ],
      },
      {
        heading: "Information we collect",
        paragraphs: [
          "We only collect the information required for the purposes described below:",
        ],
        bullets: [
          "Identity and contact details: name, email address, phone number.",
          "Shipping and billing: address, city, province or state, postal code, country.",
          "Order details: items ordered, amounts, taxes, shipping fees, promotional code used, order number and tracking number.",
          "Communications: the content of the messages you send us through the contact form or the boutique assistant.",
          "Bespoke atelier: the description you write to have a sketch generated, along with the resulting sketch.",
          "Technical information: IP address, browser and device type, pages visited — used solely for site security and abuse prevention.",
        ],
        callout:
          "We never knowingly collect sensitive information (health, origins, beliefs, biometric data), and we do not sell, rent or trade your information with anyone.",
      },
      {
        heading: "Payment information",
        paragraphs: [
          "Payments are processed by Square, a PCI-DSS certified payment provider. Your card details are entered directly into Square's secure environment: they never pass through our servers and we never have access to them.",
          "We only receive the information needed to follow up on the transaction — payment confirmation, amount, currency, status and order reference. Square's own processing is also governed by its privacy policy.",
        ],
      },
      {
        heading: "How we use your information",
        bullets: [
          "To process, prepare and ship your orders, and collect applicable taxes.",
          "To keep you informed about your order: confirmation, shipment, tracking number.",
          "To answer your questions and provide after-sales service, returns and warranty support.",
          "To generate, at your request, a bespoke design sketch and discuss it with you.",
          "To prevent fraud and abuse, and keep the site secure.",
          "To meet our legal, tax and accounting obligations.",
          "With your consent, to send you news from the house — consent you may withdraw at any time.",
        ],
        afterBullets: [
          "We do not use your information to make decisions based exclusively on automated processing, nor to profile you.",
        ],
      },
      {
        heading: "Consent",
        paragraphs: [
          "By placing an order, writing to us or using the bespoke atelier, you consent to our use of your information for the purposes set out above. This consent is express, freely given and limited to specific purposes.",
          "You may withdraw it at any time by writing to us. Please note that some information remains necessary to fulfil an order in progress, to honour the warranty, or to comply with a legal retention obligation.",
        ],
      },
      {
        heading: "Service providers we entrust information to",
        paragraphs: [
          "We work with a limited number of providers, who only access the information strictly required for their service and who are bound by their own confidentiality commitments:",
        ],
        bullets: [
          "Square — payment processing and invoicing.",
          "Google Firebase (Firestore) — hosting of the order, inventory and tracking database.",
          "SendGrid (Twilio) — sending of transactional emails: confirmation, shipment, replies to your messages.",
          "Google (Gemini) — generation of bespoke atelier sketches from the description you write.",
          "Our web hosting provider — technical operation of ameliaruby.com.",
          "Carriers (Canada Post and others depending on destination) — delivery and parcel tracking.",
        ],
      },
      {
        heading: "Disclosure of information outside Quebec",
        paragraphs: [
          "Some of these providers store or process information outside Quebec, notably in the United States. Before entrusting information to them, we assessed the protection offered as adequate, considering their contractual confidentiality commitments, the security measures in place, and the limited sensitivity of the information involved.",
          "You may write to us for further details about this assessment.",
        ],
      },
      {
        heading: "Cookies and local storage",
        paragraphs: [
          "The site uses no advertising cookies, no social network trackers and no profiling tools for marketing purposes.",
          "We only use your browser's local storage to remember your language choice and the contents of your cart. This information stays on your device and you may erase it at any time by clearing the site's data in your browser settings.",
        ],
      },
      {
        heading: "Retention periods",
        bullets: [
          "Order-related information: kept as long as needed for the warranty and to meet our tax and accounting obligations, up to seven years.",
          "Messages received through the contact form: no more than twenty-four months.",
          "Bespoke atelier descriptions and sketches: kept only for the duration of our exchange, unless they serve to prepare a bespoke order.",
          "Technical information used for abuse prevention: a few hours to a few days, then deleted automatically.",
        ],
        afterBullets: [
          "Once these periods have elapsed, the information is destroyed or anonymized.",
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "Exchanges with the site are encrypted (HTTPS/TLS). Access to orders and customer information is restricted to those who need it, and the administration area is protected by authentication.",
          "No system is infallible. In the event of a confidentiality incident presenting a risk of serious injury, we would notify you and inform Quebec's Commission d'accès à l'information, as the law requires.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: ["You have the right:"],
        bullets: [
          "To access the personal information we hold about you.",
          "To have it corrected if it is inaccurate, incomplete or ambiguous.",
          "To withdraw your consent and ask us to stop using it.",
          "To request the deletion of information whose retention is no longer necessary.",
          "To receive, in a structured and commonly used technological format, the information you provided to us.",
        ],
        callout:
          "Write to info@ameliaruby.com to exercise any of these rights: we answer within thirty days. If our answer does not satisfy you, you may file a complaint with Quebec's Commission d'accès à l'information (cai.gouv.qc.ca) or with the Office of the Privacy Commissioner of Canada.",
      },
      {
        heading: "Minors",
        paragraphs: [
          "The site is intended for an adult clientele. We do not knowingly collect information from anyone under fourteen years of age without the consent of the person having parental authority. If such information has been sent to us, write to us and we will delete it.",
        ],
      },
      {
        heading: "Changes to this policy",
        paragraphs: [
          "We may amend this policy to reflect changes in our practices or in the legal framework. The version in force is always the one published on this page, and the update date appears at the top of the document.",
        ],
      },
    ],
    contactTitle: "Contact us",
    contactText:
      "For any question about the protection of your personal information, or to exercise your rights, write to our privacy officer.",
  },
};
