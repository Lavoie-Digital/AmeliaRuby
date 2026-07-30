"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, X, Loader2, Lock,
  Plus, Minus, Trash2, ChevronLeft, ChevronRight, Settings,
  LayoutGrid, Package, PlusCircle, Upload, Eye, EyeOff, Mail, Truck, Users, Search, CheckCircle2, Clock,
  Sparkles, Send, Download, RefreshCw
} from 'lucide-react';

// --- FIREBASE SETUP ---
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, onSnapshot
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// Taux de taxe (%) par province — pour l'ESTIMATION affichée au client.
// Le montant réellement facturé est calculé côté serveur (source de vérité).
const CLIENT_TAX_RATES: Record<string, number> = {
  AB: 5, BC: 12, MB: 12, NB: 15, NL: 15, NS: 14, NT: 5, NU: 5,
  ON: 13, PE: 15, QC: 14.975, SK: 11, YT: 5,
};
function estimateTaxRate(country: string, province: string): number {
  const c = (country || '').trim().toUpperCase();
  if (c && c !== 'CA' && c !== 'CANADA') return 0;
  return CLIENT_TAX_RATES[(province || '').trim().toUpperCase()] ?? 0;
}
// Livraison : 18 $ sous 400 $ de sous-total, offerte à 400 $ et plus.
const SHIPPING_FEE = 18;
const FREE_SHIPPING_MIN = 400;
function shippingFor(subtotal: number): number {
  return subtotal < FREE_SHIPPING_MIN ? SHIPPING_FEE : 0;
}
const CA_PROVINCES = [
  ['QC', 'Québec'], ['ON', 'Ontario'], ['BC', 'Colombie-Britannique'], ['AB', 'Alberta'],
  ['MB', 'Manitoba'], ['SK', 'Saskatchewan'], ['NS', 'Nouvelle-Écosse'], ['NB', 'Nouveau-Brunswick'],
  ['NL', 'Terre-Neuve-et-Labrador'], ['PE', 'Île-du-Prince-Édouard'], ['NT', 'Territoires du N.-O.'],
  ['YT', 'Yukon'], ['NU', 'Nunavut'],
];

// Déclaration pour éviter les erreurs TypeScript
declare const __initial_auth_token: any;
declare const __firebase_config: any;
declare const __app_id: any;

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.appId || 'default-app-id';

// --- GEMINI : appel via la route serveur /api/generate-image (clé API côté serveur uniquement)

// --- COMPOSANT DE RÉVÉLATION ---
const Reveal = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`transition-all duration-[1200ms] ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

// --- CURSEUR CUSTOM DORÉ ---
const CustomCursor = () => {
  const outerRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let mx = 0, my = 0, cx = 0, cy = 0, id: number;
    const move = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener('mousemove', move);
    const tick = () => {
      cx += (mx - cx) * 0.12; cy += (my - cy) * 0.12;
      if (outerRef.current) outerRef.current.style.transform = `translate(${cx - 20}px,${cy - 20}px)`;
      if (dotRef.current) dotRef.current.style.transform = `translate(${mx - 3}px,${my - 3}px)`;
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(id); };
  }, []);
  return (
    <>
      <div ref={outerRef} className="fixed top-0 left-0 z-[9999] pointer-events-none will-change-transform hidden md:block" style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(197,160,89,0.5)' }} />
      <div ref={dotRef} className="fixed top-0 left-0 z-[9999] pointer-events-none will-change-transform hidden md:block" style={{ width: 6, height: 6, borderRadius: '50%', background: '#C5A059' }} />
    </>
  );
};

// --- COMPTEUR ANIMÉ ---
const StatCounter = ({ target, suffix = '' }: { target: number; suffix?: string }) => {
  const [val, setVal] = useState(0);
  const spanRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; obs.disconnect();
      const t0 = Date.now(), dur = 2200;
      const run = () => { const p = Math.min((Date.now() - t0) / dur, 1); setVal(Math.round((1 - Math.pow(1 - p, 4)) * target)); if (p < 1) requestAnimationFrame(run); };
      requestAnimationFrame(run);
    }, { threshold: 0.5 });
    if (spanRef.current) obs.observe(spanRef.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={spanRef}>{val}{suffix}</span>;
};

// --- CARTE TILT 3D ---
const TiltCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width - 0.5) * 12;
    const y = ((e.clientY - top) / height - 0.5) * -12;
    ref.current.style.transform = `perspective(900px) rotateX(${y}deg) rotateY(${x}deg) scale3d(1.02,1.02,1.02)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)'; };
  return <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`transition-transform duration-500 ease-out ${className}`} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>{children}</div>;
};

// --- FONCTION UTILITAIRE POUR APPELS API AVEC RETRY ---
const fetchWithBackoff = async (url: string, options: any, retries = 5, delay = 1000): Promise<any> => {
  try {
    const res = await fetch(url, options);
    if (!res.ok && res.status === 429 && retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return fetchWithBackoff(url, options, retries - 1, delay * 2);
    }
    return res;
  } catch (error) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return fetchWithBackoff(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
};

// Normalise une variante de couleur : retourne toujours un tableau d'images,
// y compris pour l'ancien format (image: string).
const getVariantImages = (variant: any): string[] => {
  if (!variant) return [];
  if (Array.isArray(variant.images) && variant.images.length > 0) return variant.images.filter(Boolean);
  if (variant.image) return [variant.image];
  return [];
};

const heroImagesDesktop = ['/hero.jpeg', '/hero-2.jpeg', '/hero-3.jpeg', '/hero-4.jpeg'];
const heroImagesMobile = ['/hero.jpeg', '/hero-2.jpeg', '/hero-3.jpeg', '/hero-4.jpeg'];

// Femmes qui ont inspiré Amélia Ruby
const inspirations = [
  { name: 'Karine', src: '/femme-2.jpeg', bag: 'Les Karines', bagEn: 'The Karines', story: "La collection Karine présente un sac compact, chic et intemporel, offert en noir, ivoire et brun. Son design épuré, son rabat structuré et sa boucle dorée lui donnent une allure raffinée, parfaite pour compléter un style élégant au quotidien comme lors d’occasions spéciales. Chaque couleur raconte une intention différente : Noir pour le caractère et la sophistication, ivoire pour la douceur et la lumière, brun pour la chaleur et l’élégance naturelle. Karine, c’est le sac essentiel : simple, distingué et facile à porter en toute saison.", storyEn: "The Karine collection features a compact, chic and timeless bag, available in black, ivory and brown. Its clean design, structured flap and golden buckle give it a refined allure, perfect for completing an elegant look both every day and on special occasions. Each colour tells a different intention: black for character and sophistication, ivory for softness and light, brown for warmth and natural elegance. Karine is the essential bag: simple, distinguished and easy to carry in any season." },
  { name: 'Katrine Marisa', src: '/femme-3.jpeg', bag: 'Sac Katrine', bagEn: 'Katrine Bag', story: "Compact, élégant et raffiné, le sac Katrine Marisa se distingue par son cuir noir texturé et son détail noué sur le devant. Son design intemporel apporte une touche de luxe discret à chaque tenue, du quotidien aux occasions spéciales. Un sac signature, chic et sophistiqué, pensé pour traverser les saisons avec style.", storyEn: "Compact, elegant and refined, the Katrine Marisa bag stands out with its textured black leather and its knotted detail on the front. Its timeless design brings a touch of understated luxury to any outfit, from everyday wear to special occasions. A signature bag — chic and sophisticated — designed to cross the seasons in style." },
  { name: 'Bianca', src: '/femme-4.jpeg', bag: 'Sac Bianca', bagEn: 'Bianca Bag', story: "Le sac Bianca se distingue par sa silhouette arrondie, sa poignée circulaire et son cuir noir élégant. Son design structuré et intemporel apporte une touche chic et raffinée à chaque style. Pensé comme une pièce accessible à tous, Bianca incarne l’élégance, le caractère et la distinction. Un sac signature, sobre et sophistiqué.", storyEn: "The Bianca bag stands out with its rounded silhouette, circular handle and elegant black leather. Its structured, timeless design brings a chic and refined touch to any style. Conceived as a piece accessible to all, Bianca embodies elegance, character and distinction. A signature bag — understated and sophisticated." },
  { name: 'Karine MC', src: '/femme-5.jpeg', bag: 'Sac Karine MC', bagEn: 'Karine MC Bag', story: "Le sac Karine MC se distingue par son cuir noir lisse, sa structure moderne et sa poignée arquée au style affirmé. Son design compact est aussi pratique qu’élégant grâce à ses deux fermetures éclair, qui permettent une ouverture de chaque côté pour un accès facile et bien organisé. Son fini noir brillant, ses détails dorés et son logo embossé lui donnent une allure sobre, raffinée et intemporelle. Karine MC, un sac chic, pratique et structuré, pensé pour accompagner chaque moment avec distinction.", storyEn: "The Karine MC bag stands out with its smooth black leather, modern structure and boldly styled arched handle. Its compact design is as practical as it is elegant thanks to its two zippers, which open on each side for easy, well-organised access. Its glossy black finish, golden details and embossed logo give it an understated, refined and timeless allure. Karine MC — a chic, practical and structured bag, designed to accompany every moment with distinction." },
];

// Points de vente — boutiques partenaires par défaut (repli si aucune boutique n'a été
// enregistrée dans l'espace admin). Logos dans /public.
const defaultRetailers = [
  { name: 'Salon Uforia', logo: "/salon-uforia.jpg", url: 'https://www.facebook.com/uforiasaloncoiffure' },
  { name: "Boutique l'effet Bulle", logo: "/boutique-leffet-bulle.png", url: 'https://www.facebook.com/Boutiqueleffetbulles' },
  { name: 'Simplement Celyne', logo: "/simplement-celyne.jpg", url: 'https://www.facebook.com/profile.php?id=100064620854240' },
  { name: 'Aberdeen Gift', logo: "/aberdeen.jpg", url: 'https://www.facebook.com/aberdeengift1' },
];

// ─── TRADUCTIONS FR / EN ───────────────────────────────────────────────
const translations = {
  fr: {
    // Navbar
    navCollection: 'Collection',
    navBespoke: 'Sur Mesure',
    navContact: 'Contact',
    navCart: 'Panier',
    // Hero
    heroLabel: 'Maison de Haute Maroquinerie · Montréal',
    heroTitle1: "L'Héritage",
    heroTitle2: 'Artisanal',
    heroSubtitle: "L'Héritage : Design intemporel conçu pour durer. Chaque pièce est imaginée avec soins et fabriquée dans les matériaux les plus nobles.",
    heroCta: 'Explorer la collection',
    heroScroll: 'Défiler',
    heroPieces: (n: number) => `${n} pièces · Collection 2026`,
    heroCollection: 'Collection 2026',
    // Marquee
    marquee: ['Chaque Sac, une Histoire', 'Haute Maroquinerie', 'Montréal', 'Fait à la Main', 'Pièces Uniques', 'Inspiré par Elles', 'Cuir Noble', "Artisanat d'Excellence", 'Créations Intemporelles', 'Atelier Amélia Ruby'],
    // Grille produits
    productsTitle1: 'Pièces',
    productsTitle2: 'Intemporelles',
    soldOut: 'Épuisé',
    viewDetails: 'Voir les détails',
    onlyLeft: 'Plus que ',
    defaultCategory: 'Collection',
    // Histoire de la marque
    universeLabel: 'Notre Univers',
    universeTitlePre: 'Chaque sac a son ',
    universeTitleEm: 'histoire',
    universeText: "Derrière chaque création, le souvenir d'une femme qui a marqué Amélia Ruby. Ces portraits, ces vies, ces histoires sont l'âme silencieuse de chacune de nos pièces.",
    readHerStory: 'Lire son histoire',
    brandQuote: "\"Coudre une pièce, c'est tisser un fil entre deux femmes — celle qui m'a inspirée, et celle qui la portera.\"",
    // Modale inspiration
    muse: 'Une muse de la maison',
    houseSignature: '— Maison Amélia Ruby',
    close: 'Fermer',
    // Points de vente
    retailersLabel: 'Nos Points de Vente',
    retailersTitlePre: 'Disponible en ',
    retailersTitleEm: 'boutique',
    retailersText: 'Retrouvez nos créations chez nos partenaires de confiance.',
    retailersVisit: 'Voir sur Facebook',
    // Atelier IA
    conciergeLabel: 'Service de Haute Conciergerie',
    atelierTitlePre: "L'Atelier ",
    atelierTitleEm: 'Virtuel',
    atelierText: "Exprimez votre vision. Notre intelligence artificielle, entraînée aux standards de la haute maroquinerie, esquissera un design exclusif. Une première étape d'inspiration avant de confier sa réalisation à nos artisans.",
    restartCreation: 'Recommencer une création',
    aiArtisan: 'Artisan IA',
    theArtisan: "L'Artisan",
    sketchInProgress: "Création de l'esquisse en cours...",
    chatPlaceholder: "Exprimez votre vision (ex: Un sac banane en cuir grainé noir, une pochette d'ordinateur...)",
    canvasBlank: 'La Toile est Vierge',
    canvasBlankText: 'Partagez votre inspiration à notre artisan virtuel pour dévoiler votre création.',
    download: 'Télécharger',
    requestQuote: 'Demander un devis',
    // Panier
    yourCart: 'Votre Panier',
    cartEmpty: 'Le panier est vide',
    total: 'Total',
    preOrder: 'Pré-commander',
    proceedPayment: 'Procéder au paiement',
    secureTransaction: 'Transaction sécurisée',
    // Modale produit
    permanentlySoldOut: 'Pièce définitivement épuisée',
    limitedEditionPre: 'Édition limitée : Plus que ',
    limitedEditionPost: ' pièce(s)',
    colorLabel: 'Couleur :',
    inStock: 'en stock',
    soldOutSuffix: ' · épuisé',
    victimSuccess: 'Victime de son succès',
    alertSoldOut: 'Victime de son succès, cette pièce est malheureusement épuisée.',
    addToCart: 'Ajouter au panier',
    // CTA sur mesure
    ctaLabel: 'Votre Histoire, Notre Atelier',
    ctaTitlePre: 'Écrivez votre',
    ctaTitleEm: 'propre chapitre',
    ctaText: "Nous avons raconté l'histoire de celles qui nous ont marquées. Confiez-nous la vôtre — et nous la cousons dans une pièce qui n'appartiendra qu'à vous.",
    ctaButtonAi: 'Atelier Virtuel IA',
    ctaButtonContact: 'Prendre Contact',
    // Formulaire de contact
    contactName: 'Nom',
    contactEmail: 'Courriel',
    contactMessage: 'Votre message',
    contactNamePh: 'Votre nom',
    contactEmailPh: 'vous@exemple.com',
    contactMessagePh: 'Racontez-nous votre histoire, votre projet, votre inspiration...',
    contactSend: 'Envoyer le message',
    contactSending: 'Envoi en cours...',
    contactSuccess: 'Merci ! Votre message a bien été envoyé. Vous recevrez une réponse dans un délai de 24 heures.',
    contactError: "Une erreur est survenue lors de l'envoi. Réessayez ou écrivez-nous à info@ameliaruby.com.",
    contactRequired: 'Veuillez remplir tous les champs.',
    contactDelay: 'Réponse garantie sous 24 heures',
    // Footer
    footerTagline: 'Maison de Haute Maroquinerie',
    footerCity: 'Montréal, Québec',
    footerCertified: 'Artisan certifié',
    footerNav: 'Navigation',
    footerAiAtelier: 'Atelier IA Sur Mesure',
    footerContact: 'Contact',
    footerPrivateAccess: 'Accès Atelier Privé',
    footerRights: '© 2026 — Maison Amélia Ruby — Tous droits réservés',
    footerMade: 'Fait avec soin à Montréal',
    footerCredit: 'Création de Lavoie Digital',
    // Chatbot messages
    chatWelcome: "Bienvenue dans l'Atelier Sur Mesure. Décrivez-moi l'allure, les matières et les détails de la création que vous imaginez (sac, banane, pochette ordinateur...). Je me chargerai d'en esquisser la vision.",
    chatLimit: 'Vous avez atteint la limite de créations pour le moment. Réessayez dans 30 minutes.',
    chatError: "Notre artisan rencontre une difficulté à visualiser ces nouveaux détails. N'hésitez pas à reformuler ou à démarrer une nouvelle toile.",
  },
  en: {
    // Navbar
    navCollection: 'Collection',
    navBespoke: 'Bespoke',
    navContact: 'Contact',
    navCart: 'Cart',
    // Hero
    heroLabel: 'House of Fine Leather Goods · Montreal',
    heroTitle1: 'Artisanal',
    heroTitle2: 'Heritage',
    heroSubtitle: 'The Heritage: timeless design built to last. Every piece is imagined with care and crafted from the noblest materials.',
    heroCta: 'Explore the collection',
    heroScroll: 'Scroll',
    heroPieces: (n: number) => `${n} pieces · 2026 Collection`,
    heroCollection: '2026 Collection',
    // Marquee
    marquee: ['Every Bag, a Story', 'Fine Leather Goods', 'Montreal', 'Handmade', 'Unique Pieces', 'Inspired by Them', 'Noble Leather', 'Craftsmanship of Excellence', 'Timeless Creations', 'Amélia Ruby Atelier'],
    // Grille produits
    productsTitle1: 'Timeless',
    productsTitle2: 'Pieces',
    soldOut: 'Sold Out',
    viewDetails: 'View details',
    onlyLeft: 'Only ',
    defaultCategory: 'Collection',
    // Histoire de la marque
    universeLabel: 'Our World',
    universeTitlePre: 'Every bag has its ',
    universeTitleEm: 'story',
    universeText: 'Behind every creation lies the memory of a woman who left her mark on Amélia Ruby. These portraits, these lives, these stories are the silent soul of each of our pieces.',
    readHerStory: 'Read her story',
    brandQuote: '"To sew a piece is to weave a thread between two women — the one who inspired me, and the one who will carry it."',
    // Modale inspiration
    muse: 'A muse of the house',
    houseSignature: '— Maison Amélia Ruby',
    close: 'Close',
    // Points de vente
    retailersLabel: 'Where to Find Us',
    retailersTitlePre: 'Available in ',
    retailersTitleEm: 'store',
    retailersText: 'Find our creations at our trusted partner boutiques.',
    retailersVisit: 'View on Facebook',
    // Atelier IA
    conciergeLabel: 'Haute Concierge Service',
    atelierTitlePre: 'The Virtual ',
    atelierTitleEm: 'Atelier',
    atelierText: 'Express your vision. Our artificial intelligence, trained to the standards of fine leather goods, will sketch an exclusive design. A first step of inspiration before entrusting its making to our artisans.',
    restartCreation: 'Start a new creation',
    aiArtisan: 'AI Artisan',
    theArtisan: 'The Artisan',
    sketchInProgress: 'Creating your sketch...',
    chatPlaceholder: 'Express your vision (e.g. a black grained-leather belt bag, a laptop sleeve...)',
    canvasBlank: 'The Canvas is Blank',
    canvasBlankText: 'Share your inspiration with our virtual artisan to unveil your creation.',
    download: 'Download',
    requestQuote: 'Request a quote',
    // Panier
    yourCart: 'Your Cart',
    cartEmpty: 'Your cart is empty',
    total: 'Total',
    preOrder: 'Pre-order',
    proceedPayment: 'Proceed to payment',
    secureTransaction: 'Secure transaction',
    // Modale produit
    permanentlySoldOut: 'Piece permanently sold out',
    limitedEditionPre: 'Limited edition: only ',
    limitedEditionPost: ' piece(s) left',
    colorLabel: 'Colour:',
    inStock: 'in stock',
    soldOutSuffix: ' · sold out',
    victimSuccess: 'Victim of its success',
    alertSoldOut: 'Victim of its success, this piece is unfortunately sold out.',
    addToCart: 'Add to cart',
    // CTA sur mesure
    ctaLabel: 'Your Story, Our Atelier',
    ctaTitlePre: 'Write your',
    ctaTitleEm: 'own chapter',
    ctaText: 'We have told the stories of the women who left their mark on us. Entrust us with yours — and we will sew it into a piece that belongs to you alone.',
    ctaButtonAi: 'AI Virtual Atelier',
    ctaButtonContact: 'Get in touch',
    // Formulaire de contact
    contactName: 'Name',
    contactEmail: 'Email',
    contactMessage: 'Your message',
    contactNamePh: 'Your name',
    contactEmailPh: 'you@example.com',
    contactMessagePh: 'Tell us your story, your project, your inspiration...',
    contactSend: 'Send message',
    contactSending: 'Sending...',
    contactSuccess: 'Thank you! Your message has been sent. You will receive a reply within 24 hours.',
    contactError: 'Something went wrong while sending. Please try again or email us at info@ameliaruby.com.',
    contactRequired: 'Please fill in all fields.',
    contactDelay: 'Guaranteed reply within 24 hours',
    // Footer
    footerTagline: 'House of Fine Leather Goods',
    footerCity: 'Montreal, Quebec',
    footerCertified: 'Certified artisan',
    footerNav: 'Navigation',
    footerAiAtelier: 'AI Bespoke Atelier',
    footerContact: 'Contact',
    footerPrivateAccess: 'Private Atelier Access',
    footerRights: '© 2026 — Maison Amélia Ruby — All rights reserved',
    footerMade: 'Made with care in Montreal',
    footerCredit: 'Created by Lavoie Digital',
    // Chatbot messages
    chatWelcome: 'Welcome to the Bespoke Atelier. Describe to me the allure, the materials and the details of the creation you have in mind (bag, belt bag, laptop sleeve...). I will sketch out the vision for you.',
    chatLimit: 'You have reached the creation limit for now. Please try again in 30 minutes.',
    chatError: 'Our artisan is having trouble visualising these new details. Feel free to rephrase or start a new canvas.',
  },
} as const;

type Lang = keyof typeof translations;

export default function App() {
  // États Globaux
  const [view, setView] = useState<'shop' | 'admin'>('shop');
  // Langue (FR / EN) — persistée dans localStorage
  const [lang, setLang] = useState<Lang>('fr');
  const t = translations[lang];
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ar-lang');
      if (stored === 'fr' || stored === 'en') setLang(stored);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('ar-lang', lang); } catch {}
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);
  const [adminTab, setAdminTab] = useState<'inventory' | 'clients' | 'promos' | 'boutiques'>('inventory');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminSessionPassword, setAdminSessionPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Codes promo
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [isLoadingPromos, setIsLoadingPromos] = useState(false);
  const [newPromo, setNewPromo] = useState({ code: '', percentOff: '', maxRedemptions: '', expiresAt: '' });
  const [promoFormError, setPromoFormError] = useState('');
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);
  
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  // Boutiques / points de vente (temps réel depuis Firestore)
  const [retailers, setRetailers] = useState<any[]>([]);
  const [newRetailer, setNewRetailer] = useState({ name: '', url: '', logo: '' });
  const [editingRetailer, setEditingRetailer] = useState<any | null>(null);
  const [isSavingRetailer, setIsSavingRetailer] = useState(false);
  const [isSeedingRetailers, setIsSeedingRetailers] = useState(false);
  const [isUploadingRetailerLogo, setIsUploadingRetailerLogo] = useState(false);
  const [retailerFormError, setRetailerFormError] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [trackings, setTrackings] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [squareSdkReady, setSquareSdkReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedInspiration, setSelectedInspiration] = useState<typeof inspirations[number] | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const heroImages = isMobile ? heroImagesMobile : heroImagesDesktop;
  
  // États Boutique
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  // Checkout Square (Web Payments SDK)
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [orderResult, setOrderResult] = useState<{ amount: number; receiptUrl: string | null } | null>(null);
  const [checkoutForm, setCheckoutForm] = useState({
    name: '', email: '', phone: '',
    line1: '', line2: '', city: '', province: 'QC', postalCode: '', country: 'CA',
    promoCode: '',
  });
  const squarePaymentsRef = useRef<any>(null);
  const squareCardRef = useRef<any>(null);

  // États Formulaire de contact
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [contactFeedback, setContactFeedback] = useState('');

  // États Admin - Produit
  const [isEditing, setIsEditing] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', price: '' as number | string, description: '', category: 'Sac à main', colors: '', images: [] as string[],
    stockQuantity: 1, showFomo: false, isPublished: false, isPreOrder: false,
    colorVariants: [] as { name: string; images: string[]; stockQuantity: number }[],
  });

  // États Admin - Suivi
  const [trackingForm, setTrackingForm] = useState({
    email: '', name: '', carrier: 'Poste Canada', trackingNumber: '', commandeId: '', produits: ''
  });
  const [clientSearch, setClientSearch] = useState('');
  const [isSendingTracking, setIsSendingTracking] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // IA Chatbot États
  const initialChatMessage = { role: 'bot', type: 'text', content: t.chatWelcome };
  const [chatMessages, setChatMessages] = useState<Array<{role: string, type: string, content: string}>>([initialChatMessage]);
  // Retraduire le message d'accueil si l'utilisateur change de langue avant d'interagir
  useEffect(() => {
    setChatMessages(prev => (prev.length === 1 && prev[0].role === 'bot' && prev[0].type === 'text')
      ? [{ role: 'bot', type: 'text', content: t.chatWelcome }]
      : prev);
  }, [lang, t.chatWelcome]);
  const [chatInput, setChatInput] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [latestImage, setLatestImage] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Gestion du scroll pour la nav
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 50);
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? (y / total) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // Détection mobile pour choisir le set d'images du hero
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => { setIsMobile(mq.matches); setHeroIndex(0); };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Slideshow hero
  useEffect(() => {
    const t = setInterval(() => setHeroIndex(i => (i + 1) % heroImages.length), 5500);
    return () => clearInterval(t);
  }, [heroImages.length]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Scroll automatique du chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isGeneratingImage]);

  // 1. CHARGEMENT DYNAMIQUE DU SDK SQUARE (Web Payments)
  useEffect(() => {
    if ((window as any).Square) { setSquareSdkReady(true); return; }
    const env = (process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();
    const src = env === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => setSquareSdkReady(true);
    document.body.appendChild(script);
  }, []);

  // 2. AUTHENTIFICATION FIREBASE
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Auth Error", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 3. FETCH DATA INVENTAIRE (lecture publique en temps réel)
  useEffect(() => {
    if (!user) return;

    const qInv = collection(db, 'artifacts', appId, 'public', 'data', 'inventory');
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setIsLoading(false);
    });

    return () => { unsubInv(); };
  }, [user]);

  // 3b. FETCH BOUTIQUES / POINTS DE VENTE (lecture publique en temps réel)
  useEffect(() => {
    if (!user) return;

    const qRet = collection(db, 'artifacts', appId, 'public', 'data', 'retailers');
    const unsubRet = onSnapshot(qRet, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      setRetailers(data);
    }, (err) => {
      console.error(err);
    });

    return () => { unsubRet(); };
  }, [user]);

  // Charger les codes promo quand l'onglet est ouvert
  useEffect(() => {
    if (view === 'admin' && isAdminAuthenticated && adminTab === 'promos') {
      fetchPromoCodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, isAdminAuthenticated, adminTab]);

  // Charger commandes + trackings quand l'admin se connecte (et rafraîchir périodiquement)
  useEffect(() => {
    if (!(view === 'admin' && isAdminAuthenticated)) return;
    fetchClients();
    fetchTrackings();
    const interval = setInterval(() => {
      fetchClients();
      fetchTrackings();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, isAdminAuthenticated]);

  // 4. INITIALISATION DU FORMULAIRE DE CARTE SQUARE
  useEffect(() => {
    if (!showCheckout || !squareSdkReady || orderResult) return;

    let cardInstance: any = null;
    let cancelled = false;

    const initCard = async () => {
      const Sq = (window as any).Square;
      if (!Sq) return;
      const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '';
      const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || '';
      if (!appId || !locationId) {
        setCheckoutError("Configuration de paiement manquante.");
        return;
      }
      try {
        const payments = Sq.payments(appId, locationId);
        squarePaymentsRef.current = payments;
        cardInstance = await payments.card();
        if (cancelled) { try { cardInstance.destroy(); } catch {} return; }
        await cardInstance.attach('#sq-card');
        squareCardRef.current = cardInstance;
      } catch (error) {
        console.error("Erreur d'initialisation Square:", error);
        setCheckoutError("Impossible de charger le module de paiement.");
      }
    };

    initCard();
    return () => {
      cancelled = true;
      if (cardInstance) { try { cardInstance.destroy(); } catch {} }
      squareCardRef.current = null;
    };
  }, [showCheckout, squareSdkReady, orderResult]);

  // --- LOGIQUE PANIER ---
  const addToCart = (product: any) => {
    // Vérification du stock
    const isSoldOut = product.stockQuantity !== undefined && product.stockQuantity <= 0;
    if (isSoldOut) {
      alert(t.alertSoldOut);
      return;
    }

    const variants = Array.isArray(product.colorVariants) ? product.colorVariants : [];
    const hasVariants = variants.length > 0;
    const legacyColors = product.colors ? product.colors.split(',').map((c:string) => c.trim()).filter(Boolean) : [];
    const needsColor = hasVariants || legacyColors.length > 0;

    if (needsColor && !selectedColor) {
      alert("Veuillez sélectionner une couleur.");
      return;
    }

    // Vérifier le stock — par variante si applicable, sinon global
    if (hasVariants) {
      const variant = variants.find((v: any) => v.name === selectedColor);
      if (!variant || variant.stockQuantity <= 0) {
        alert(`La couleur "${selectedColor}" est malheureusement épuisée.`);
        return;
      }
      const currentCartQty = cart.filter(i => i.id === product.id && i.selectedColor === selectedColor).reduce((sum, item) => sum + item.quantity, 0);
      if (currentCartQty >= variant.stockQuantity) {
        alert(`Notre atelier ne dispose plus que de ${variant.stockQuantity} exemplaire(s) de cette pièce en ${selectedColor}.`);
        return;
      }
    } else {
      const currentCartQtyForProduct = cart.filter(i => i.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
      if (product.stockQuantity !== undefined && currentCartQtyForProduct >= product.stockQuantity) {
        alert(`Notre atelier ne dispose plus que de ${product.stockQuantity} exemplaire(s) de cette pièce.`);
        return;
      }
    }

    setCart(prev => {
      const exists = prev.find(i => i.id === product.id && i.selectedColor === selectedColor);
      if (exists) {
        return prev.map(i => (i.id === product.id && i.selectedColor === selectedColor) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const cartItemId = selectedColor ? `${product.id}-${selectedColor}` : product.id;
      return [...prev, { ...product, cartItemId, selectedColor, quantity: 1 }];
    });
    
    setSelectedProduct(null);
    setSelectedColor('');
    setIsCartOpen(true);
  };

  const updateQty = (cartItemId: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.cartItemId === cartItemId);
      if(!item) return prev;

      // Si on augmente, vérifier la limite globale pour ce produit
      if (delta > 0 && item.stockQuantity !== undefined) {
          const currentCartQtyForProduct = prev.filter(i => i.id === item.id).reduce((sum, i) => sum + i.quantity, 0);
          if (currentCartQtyForProduct >= item.stockQuantity) {
              alert(`Limite de stock atteinte (${item.stockQuantity} pièce(s) disponible(s)).`);
              return prev;
          }
      }

      return prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i);
    });
  };

  const removeItem = (cartItemId: string) => setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));

  // --- PAIEMENT (Square Web Payments) ---
  // Ouvre le formulaire de paiement intégré.
  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCheckoutError('');
    setOrderResult(null);
    setShowCheckout(true);
    setIsCartOpen(false);
  };

  // Tokenise la carte via Square puis envoie le paiement au serveur.
  const submitPayment = async () => {
    setCheckoutError('');
    const f = checkoutForm;
    if (!f.name.trim() || !f.email.trim() || !f.line1.trim() || !f.city.trim() || !f.postalCode.trim() || !f.country.trim()) {
      setCheckoutError("Veuillez remplir tous les champs requis (*).");
      return;
    }
    if (!squareCardRef.current) {
      setCheckoutError("Le formulaire de carte n'est pas encore prêt.");
      return;
    }
    try {
      setIsCheckingOut(true);
      const tokenResult = await squareCardRef.current.tokenize();
      if (tokenResult.status !== 'OK') {
        const detail = tokenResult.errors?.[0]?.message;
        setCheckoutError(detail || "Carte invalide. Vérifiez vos informations.");
        return;
      }

      // 3D Secure / SCA — requis par les banques européennes (FR/BE/CH),
      // améliore aussi le taux d'approbation sur toutes les cartes.
      let verificationToken: string | undefined;
      if (squarePaymentsRef.current?.verifyBuyer) {
        try {
          const subtotal = cart.reduce((a, b) => a + (b.price * b.quantity), 0);
          const shipping = shippingFor(subtotal);
          const rate = estimateTaxRate(f.country, f.province);
          const amountStr = ((subtotal + shipping) * (1 + rate / 100)).toFixed(2);
          const parts = f.name.trim().split(/\s+/);
          const verify = await squarePaymentsRef.current.verifyBuyer(tokenResult.token, {
            amount: amountStr,
            currencyCode: 'CAD',
            intent: 'CHARGE',
            billingContact: {
              givenName: parts[0] || undefined,
              familyName: parts.slice(1).join(' ') || undefined,
              email: f.email.trim() || undefined,
              phone: f.phone.trim() || undefined,
              addressLines: [f.line1.trim(), f.line2.trim()].filter(Boolean),
              city: f.city.trim() || undefined,
              state: f.province.trim() || undefined,
              postalCode: f.postalCode.trim() || undefined,
              countryCode: f.country.trim() || undefined,
            },
          });
          verificationToken = verify?.token;
        } catch (verr) {
          console.error('verifyBuyer:', verr);
          setCheckoutError("La vérification de sécurité de la carte a échoué ou a été annulée.");
          return;
        }
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: tokenResult.token,
          verificationToken,
          items: cart.map(i => ({
            id: i.id,
            name: i.selectedColor ? `${i.name} (${i.selectedColor})` : i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          customer: { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() },
          shipping: {
            line1: f.line1.trim(), line2: f.line2.trim(), city: f.city.trim(),
            province: f.province.trim(), postalCode: f.postalCode.trim(), country: f.country.trim(),
          },
          promoCode: f.promoCode.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setCheckoutError(data.error || "Le paiement a échoué. Veuillez réessayer.");
        return;
      }

      setOrderResult({ amount: data.amount, receiptUrl: data.receiptUrl || null });
      setCart([]);
    } catch (e) {
      setCheckoutError("Erreur réseau lors du paiement.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const closeCheckout = () => {
    setShowCheckout(false);
    setOrderResult(null);
    setCheckoutError('');
  };

  // --- LOGIQUE ADMIN ---
  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setAdminPassword('');
    setAdminSessionPassword('');
    setPromoCodes([]);
    setView('shop');
  };

  // --- LOGIQUE COMMANDES & SUIVI (lecture serveur, données privées) ---
  const fetchClients = async () => {
    if (!adminSessionPassword) return;
    try {
      const res = await fetch('/api/admin/clients', {
        headers: { 'x-admin-password': adminSessionPassword },
      });
      if (res.ok) {
        setClients(await res.json());
      } else if (res.status === 401) {
        logoutAdmin();
      }
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
    }
  };

  const fetchTrackings = async () => {
    if (!adminSessionPassword) return;
    try {
      const res = await fetch('/api/admin/trackings', {
        headers: { 'x-admin-password': adminSessionPassword },
      });
      if (res.ok) {
        setTrackings(await res.json());
      } else if (res.status === 401) {
        logoutAdmin();
      }
    } catch (err) {
      console.error('Erreur chargement trackings:', err);
    }
  };

  // --- LOGIQUE CODES PROMO ---
  const fetchPromoCodes = async () => {
    if (!adminSessionPassword) return;
    setIsLoadingPromos(true);
    try {
      const res = await fetch('/api/admin/promo-codes', {
        headers: { 'x-admin-password': adminSessionPassword },
      });
      if (res.ok) {
        const data = await res.json();
        setPromoCodes(data);
      } else if (res.status === 401) {
        logoutAdmin();
      }
    } catch (err) {
      console.error('Erreur chargement codes promo:', err);
    } finally {
      setIsLoadingPromos(false);
    }
  };

  const createPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoFormError('');

    const code = newPromo.code.trim().toUpperCase();
    const percentOff = Number(newPromo.percentOff);

    if (!code || code.length < 3) {
      setPromoFormError('Le code doit contenir au moins 3 caractères.');
      return;
    }
    if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
      setPromoFormError('Le pourcentage doit être entre 1 et 100.');
      return;
    }

    const payload: any = { code, percentOff };
    if (newPromo.maxRedemptions) {
      const m = Number(newPromo.maxRedemptions);
      if (Number.isFinite(m) && m > 0) payload.maxRedemptions = Math.floor(m);
    }
    if (newPromo.expiresAt) {
      const ts = Math.floor(new Date(newPromo.expiresAt).getTime() / 1000);
      if (ts > Math.floor(Date.now() / 1000)) payload.expiresAt = ts;
    }

    setIsCreatingPromo(true);
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminSessionPassword,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setNewPromo({ code: '', percentOff: '', maxRedemptions: '', expiresAt: '' });
        await fetchPromoCodes();
      } else {
        const data = await res.json().catch(() => ({}));
        setPromoFormError(data.error || 'Erreur lors de la création du code.');
      }
    } catch {
      setPromoFormError('Erreur de connexion. Réessayez.');
    } finally {
      setIsCreatingPromo(false);
    }
  };

  const togglePromoCode = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/admin/promo-codes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminSessionPassword,
        },
        body: JSON.stringify({ active }),
      });
      if (res.ok) await fetchPromoCodes();
    } catch (err) {
      console.error('Erreur mise à jour code promo:', err);
    }
  };

  const deletePromoCode = async (id: string) => {
    if (!confirm('Désactiver et supprimer définitivement ce code promo ?')) return;
    try {
      const res = await fetch(`/api/admin/promo-codes/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminSessionPassword },
      });
      if (res.ok) await fetchPromoCodes();
    } catch (err) {
      console.error('Erreur suppression code promo:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: FileList | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      files = (e as React.DragEvent).dataTransfer.files;
    } else {
      files = (e.target as HTMLInputElement).files;
    }
    if (!files) return;

    setIsUploading(true);
    const fileArray = Array.from(files);
    const readers = fileArray.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(base64Images => {
      if (isEditing) {
        setIsEditing({ ...isEditing, images: [...(isEditing.images || []), ...base64Images] });
      } else {
        setNewProduct({ ...newProduct, images: [...newProduct.images, ...base64Images] });
      }
      setIsUploading(false);
    });
  };

  const removeImage = (index: number) => {
    if (isEditing) {
      const newImages = isEditing.images.filter((_: any, i: number) => i !== index);
      setIsEditing({ ...isEditing, images: newImages });
    } else {
      const newImages = newProduct.images.filter((_, i) => i !== index);
      setNewProduct({ ...newProduct, images: newImages });
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSessionPassword) return;
    try {
      if (isEditing) {
        const { id, ...updates } = isEditing;
        const res = await fetch(`/api/admin/inventory/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminSessionPassword,
          },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error('Erreur sauvegarde');
        setIsEditing(null);
      } else {
        const res = await fetch('/api/admin/inventory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': adminSessionPassword,
          },
          body: JSON.stringify(newProduct),
        });
        if (!res.ok) throw new Error('Erreur création');
        setNewProduct({ name: '', price: '', description: '', category: 'Sac à main', colors: '', images: [] as string[], stockQuantity: 1, showFomo: false, isPublished: false, isPreOrder: false, colorVariants: [] });
      }
    } catch (err) { console.error("Save error", err); }
  };

  const deleteProduct = async (id: string) => {
    if(!confirm("Supprimer définitivement cette pièce ?")) return;
    try {
      const res = await fetch(`/api/admin/inventory/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminSessionPassword },
      });
      if (!res.ok) throw new Error('Erreur suppression');
    } catch (err) { console.error('Delete error', err); }
  };

  // ─── BOUTIQUES / POINTS DE VENTE ───────────────────────────────
  const handleRetailerLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingRetailerLogo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (editingRetailer) {
        setEditingRetailer({ ...editingRetailer, logo: base64 });
      } else {
        setNewRetailer({ ...newRetailer, logo: base64 });
      }
      setIsUploadingRetailerLogo(false);
    };
    reader.onerror = () => setIsUploadingRetailerLogo(false);
    reader.readAsDataURL(file);
  };

  const normalizeRetailerUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const saveRetailer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSessionPassword) return;
    setRetailerFormError('');

    const source = editingRetailer || newRetailer;
    if (!source.name?.trim()) {
      setRetailerFormError('Le nom de la boutique est requis.');
      return;
    }

    setIsSavingRetailer(true);
    try {
      if (editingRetailer) {
        const { id, ...updates } = editingRetailer;
        const res = await fetch(`/api/admin/retailers/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-password': adminSessionPassword },
          body: JSON.stringify({ ...updates, url: normalizeRetailerUrl(updates.url || '') }),
        });
        if (!res.ok) throw new Error('Erreur sauvegarde');
        setEditingRetailer(null);
      } else {
        const res = await fetch('/api/admin/retailers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-password': adminSessionPassword },
          body: JSON.stringify({ ...newRetailer, url: normalizeRetailerUrl(newRetailer.url), order: retailers.length }),
        });
        if (!res.ok) throw new Error('Erreur création');
        setNewRetailer({ name: '', url: '', logo: '' });
      }
    } catch (err) {
      console.error('Save retailer error', err);
      setRetailerFormError("Une erreur est survenue. Réessayez.");
    } finally {
      setIsSavingRetailer(false);
    }
  };

  const deleteRetailer = async (id: string) => {
    if (!confirm('Retirer cette boutique de la liste ?')) return;
    try {
      const res = await fetch(`/api/admin/retailers/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminSessionPassword },
      });
      if (!res.ok) throw new Error('Erreur suppression');
      if (editingRetailer?.id === id) setEditingRetailer(null);
    } catch (err) { console.error('Delete retailer error', err); }
  };

  // Migration : importe dans Firestore les boutiques déjà affichées sur le site
  const seedDefaultRetailers = async () => {
    if (!adminSessionPassword) return;
    setIsSeedingRetailers(true);
    try {
      for (let i = 0; i < defaultRetailers.length; i++) {
        const r = defaultRetailers[i];
        await fetch('/api/admin/retailers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-password': adminSessionPassword },
          body: JSON.stringify({ ...r, order: i }),
        });
      }
    } catch (err) {
      console.error('Seed retailers error', err);
    } finally {
      setIsSeedingRetailers(false);
    }
  };

  const sendTrackingEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingForm.commandeId || !adminSessionPassword) return;

    setIsSendingTracking(true);
    setTrackingStatus('idle');
    try {
      // 1. Envoyer le courriel via SendGrid
      const res = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trackingForm.email,
          name: trackingForm.name,
          carrier: trackingForm.carrier,
          trackingNumber: trackingForm.trackingNumber,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur envoi courriel');
      }

      // 2. & 3. Enregistrer dans l'historique + mettre à jour le statut de la commande via l'API admin
      const trackingRes = await fetch('/api/admin/trackings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminSessionPassword,
        },
        body: JSON.stringify({
          commandeId: trackingForm.commandeId,
          trackingNumber: trackingForm.trackingNumber,
          email: trackingForm.email,
          nom: trackingForm.name,
          produits: trackingForm.produits,
          transporteur: trackingForm.carrier,
        }),
      });
      if (!trackingRes.ok) {
        const err = await trackingRes.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur enregistrement tracking');
      }

      // Rafraîchir les listes
      await Promise.all([fetchClients(), fetchTrackings()]);

      setTrackingStatus('success');
      setTrackingForm({ ...trackingForm, trackingNumber: '', commandeId: '', produits: '' });
      setTimeout(() => setTrackingStatus('idle'), 3000);
    } catch (err) {
      console.error('Erreur tracking:', err);
      setTrackingStatus('error');
    } finally {
      setIsSendingTracking(false);
    }
  };

  const openProductModal = (product: any) => {
    setSelectedProduct(product);
    setCurrentImageIndex(0);
    const productColors = product.colors ? product.colors.split(',').map((c:string) => c.trim()).filter(Boolean) : [];
    if(productColors.length > 0) setSelectedColor(productColors[0]);
    else setSelectedColor('');
  };

  // --- FORMULAIRE DE CONTACT ---
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contactStatus === 'sending') return;
    const name = contactForm.name.trim();
    const email = contactForm.email.trim();
    const message = contactForm.message.trim();
    if (!name || !email || !message) {
      setContactStatus('error');
      setContactFeedback(t.contactRequired);
      return;
    }
    setContactStatus('sending');
    setContactFeedback('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, lang }),
      });
      if (!res.ok) throw new Error('send failed');
      setContactStatus('success');
      setContactFeedback(t.contactSuccess);
      setContactForm({ name: '', email: '', message: '' });
    } catch {
      setContactStatus('error');
      setContactFeedback(t.contactError);
    }
  };

  // --- LOGIQUE CHATBOT IA (RÉINITIALISATION DE L'ATELIER) ---
  const resetChat = () => {
    if (confirm("Voulez-vous effacer la toile et recommencer une nouvelle création ?")) {
      setChatMessages([initialChatMessage]);
      setLatestImage(null);
      setChatInput('');
    }
  };

  // --- LOGIQUE CHATBOT IA (GÉNÉRATION D'INSPIRATION) ---
  const handleChatSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if(!chatInput.trim() || isGeneratingImage) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', type: 'text', content: userMessage }]);
    setIsGeneratingImage(true);

    const allUserRequests = chatMessages
      .filter(m => m.role === 'user')
      .map(m => m.content);
    allUserRequests.push(userMessage);

    const designBrief = allUserRequests.join(" | ");

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designBrief }),
      });

      if (response.status === 429) {
        setChatMessages(prev => [...prev, { role: 'bot', type: 'text', content: t.chatLimit }]);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error("Erreur API :", errorData);
        throw new Error(errorData.error || `Erreur API (${response.status})`);
      }

      const data = await response.json();
      if (data.imageUrl) {
        setLatestImage(data.imageUrl);
        setChatMessages(prev => [
          ...prev,
          { role: 'bot', type: 'image', content: data.imageUrl },
          { role: 'bot', type: 'text', content: 'Voici une nouvelle interprétation intégrant vos dernières envies. Si cette direction vous plaît, nous pouvons l\'affiner avec notre artisan.' }
        ]);
      } else {
        throw new Error("Format de réponse invalide.");
      }

    } catch (error: any) {
      console.error("Erreur génération :", error);
      setChatMessages(prev => [...prev, { role: 'bot', type: 'text', content: t.chatError }]);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadImage = () => {
    if (!latestImage) return;
    const a = document.createElement('a');
    a.href = latestImage;
    a.download = `esquisse-amelie-purtell-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };


  // --- RENDU ADMIN ---
  if (view === 'admin') {
    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6 font-sans">
          <button onClick={() => setView('shop')} className="absolute top-10 left-10 text-[10px] uppercase tracking-[0.3em] text-stone-400 hover:text-black transition-colors flex items-center gap-2">
            <ChevronLeft size={14} /> Boutique
          </button>
          <div className="w-full max-w-sm space-y-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="space-y-4">
              <h1 className="text-2xl font-serif uppercase tracking-[0.5em] font-light">Amélia Ruby</h1>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[#C5A059] font-medium">Espace Privé Artisan</p>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isVerifyingAdmin) return;
                setAdminLoginError('');
                setIsVerifyingAdmin(true);
                try {
                  const res = await fetch('/api/admin/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: adminPassword }),
                  });
                  if (res.ok) {
                    setAdminSessionPassword(adminPassword);
                    setIsAdminAuthenticated(true);
                    setAdminPassword('');
                  } else {
                    setAdminLoginError('Code incorrect.');
                  }
                } catch {
                  setAdminLoginError('Erreur de connexion. Réessayez.');
                } finally {
                  setIsVerifyingAdmin(false);
                }
              }}
              className="space-y-8"
            >
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Code d'accès atelier"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoComplete="off"
                  className="w-full bg-transparent border-b border-stone-200 py-4 text-center text-sm tracking-[0.2em] outline-none transition-all placeholder:text-[10px]"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {adminLoginError && (
                <p className="text-[10px] uppercase tracking-[0.3em] text-red-600 font-light text-center">{adminLoginError}</p>
              )}
              <button
                type="submit"
                disabled={isVerifyingAdmin || !adminPassword}
                className="w-full bg-stone-900 text-white py-5 text-[10px] uppercase tracking-[0.3em] font-medium hover:bg-[#C5A059] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifyingAdmin ? 'Vérification…' : 'Connexion'}
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans p-6 md:p-12">
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 border-b pb-8">
            <div>
              <h1 className="text-3xl font-serif">Maison Amélia Ruby</h1>
              <div className="flex gap-8 mt-6">
                <button 
                  onClick={() => setAdminTab('inventory')}
                  className={`text-[10px] uppercase tracking-widest pb-2 border-b-2 transition-all ${adminTab === 'inventory' ? 'border-[#C5A059] text-black' : 'border-transparent text-stone-400'}`}
                >
                  Collections
                </button>
                <button
                  onClick={() => setAdminTab('clients')}
                  className={`text-[10px] uppercase tracking-widest pb-2 border-b-2 transition-all ${adminTab === 'clients' ? 'border-[#C5A059] text-black' : 'border-transparent text-stone-400'}`}
                >
                  Commandes & Suivi
                </button>
                <button
                  onClick={() => setAdminTab('promos')}
                  className={`text-[10px] uppercase tracking-widest pb-2 border-b-2 transition-all ${adminTab === 'promos' ? 'border-[#C5A059] text-black' : 'border-transparent text-stone-400'}`}
                >
                  Codes Promo
                </button>
                <button
                  onClick={() => setAdminTab('boutiques')}
                  className={`text-[10px] uppercase tracking-widest pb-2 border-b-2 transition-all ${adminTab === 'boutiques' ? 'border-[#C5A059] text-black' : 'border-transparent text-stone-400'}`}
                >
                  Boutiques
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setView('shop')} className="bg-white border border-stone-200 px-6 py-3 text-[10px] uppercase tracking-widest hover:bg-stone-50 transition-all flex items-center gap-2">
                <Eye size={14}/> Boutique
              </button>
              <button onClick={logoutAdmin} className="bg-stone-900 text-white px-8 py-3 text-[10px] uppercase tracking-widest hover:bg-red-900 transition-all shadow-lg flex items-center gap-2">
                <Lock size={14} /> Déconnexion
              </button>
            </div>
          </header>

          {adminTab === 'inventory' ? (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-500">
             {/* FORMULAIRE PRODUIT */}
             <div className="lg:col-span-5">
               <form onSubmit={saveProduct} className="bg-white p-8 shadow-sm border border-stone-100 space-y-6 sticky top-12 rounded-sm">
                 <h3 className="font-serif text-xl border-b pb-4 flex items-center gap-2">
                   {isEditing ? <Settings size={18}/> : <PlusCircle size={18}/>}
                   {isEditing ? 'Modifier la pièce' : 'Nouvelle création'}
                 </h3>
                 <div className="space-y-4">
                   <input 
                     type="text" placeholder="Nom de la pièce" required
                     value={isEditing ? isEditing.name : newProduct.name}
                     onChange={e => isEditing ? setIsEditing({...isEditing, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})}
                     className="w-full border-b py-2 focus:border-[#C5A059] outline-none font-light"
                   />
                   <div className="grid grid-cols-2 gap-4">
                     <input
                       type="number" placeholder="Prix ($ CAD)" required step="0.01" min="0"
                       value={isEditing ? isEditing.price : newProduct.price}
                       onChange={e => {
                         const val = e.target.value === '' ? '' : Number(e.target.value);
                         isEditing ? setIsEditing({...isEditing, price: val}) : setNewProduct({...newProduct, price: val});
                       }}
                       className="w-full border-b py-2 focus:border-[#C5A059] outline-none font-light"
                     />
                     <input 
                       type="text" placeholder="Catégorie"
                       value={isEditing ? isEditing.category : newProduct.category}
                       onChange={e => isEditing ? setIsEditing({...isEditing, category: e.target.value}) : setNewProduct({...newProduct, category: e.target.value})}
                       className="w-full border-b py-2 focus:border-[#C5A059] outline-none font-light"
                     />
                   </div>

                   {/* GESTION DE L'INVENTAIRE ET FOMO */}
                   <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-50 border-b pb-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] uppercase tracking-[0.2em] text-[#C5A059] font-medium">Quantité en stock</label>
                        <input 
                          type="number" placeholder="Stock" min="0" required
                          value={isEditing ? isEditing.stockQuantity : newProduct.stockQuantity}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            isEditing ? setIsEditing({...isEditing, stockQuantity: val}) : setNewProduct({...newProduct, stockQuantity: val});
                          }}
                          className="w-full border-b py-1 focus:border-[#C5A059] outline-none font-light"
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${ (isEditing ? isEditing.showFomo : newProduct.showFomo) ? 'bg-[#C5A059] border-[#C5A059]' : 'border-stone-300 group-hover:border-[#C5A059]'}`}>
                              {(isEditing ? isEditing.showFomo : newProduct.showFomo) && <CheckCircle2 size={12} className="text-white"/>}
                          </div>
                          <span className="text-[9px] uppercase tracking-[0.2em] text-stone-500 group-hover:text-black transition-colors">Créer l'urgence (FOMO)</span>
                          <input
                            type="checkbox" className="hidden"
                            checked={isEditing ? isEditing.showFomo : newProduct.showFomo}
                            onChange={e => isEditing ? setIsEditing({...isEditing, showFomo: e.target.checked}) : setNewProduct({...newProduct, showFomo: e.target.checked})}
                          />
                        </label>
                      </div>
                   </div>

                   <div className="flex items-center gap-3 px-3 py-3 bg-stone-50 border border-stone-100">
                     <label className="flex items-center gap-3 cursor-pointer group flex-1">
                       <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${ (isEditing ? isEditing.isPublished : newProduct.isPublished) ? 'bg-green-600 border-green-600' : 'border-stone-300 group-hover:border-green-600'}`}>
                           {(isEditing ? isEditing.isPublished : newProduct.isPublished) && <CheckCircle2 size={12} className="text-white"/>}
                       </div>
                       <div className="flex flex-col gap-0.5">
                         <span className="text-[10px] uppercase tracking-[0.2em] text-stone-700 font-medium group-hover:text-black transition-colors">Publier sur la boutique</span>
                         <span className="text-[9px] text-stone-400 font-light">Décocher pour préparer en mode brouillon</span>
                       </div>
                       <input
                         type="checkbox" className="hidden"
                         checked={isEditing ? !!isEditing.isPublished : newProduct.isPublished}
                         onChange={e => isEditing ? setIsEditing({...isEditing, isPublished: e.target.checked}) : setNewProduct({...newProduct, isPublished: e.target.checked})}
                       />
                     </label>
                   </div>

                   <div className="flex items-center gap-3 px-3 py-3 bg-stone-50 border border-stone-100">
                     <label className="flex items-center gap-3 cursor-pointer group flex-1">
                       <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${ (isEditing ? isEditing.isPreOrder : newProduct.isPreOrder) ? 'bg-amber-600 border-amber-600' : 'border-stone-300 group-hover:border-amber-600'}`}>
                           {(isEditing ? isEditing.isPreOrder : newProduct.isPreOrder) && <CheckCircle2 size={12} className="text-white"/>}
                       </div>
                       <div className="flex flex-col gap-0.5">
                         <span className="text-[10px] uppercase tracking-[0.2em] text-stone-700 font-medium group-hover:text-black transition-colors">Mode pré-commande</span>
                         <span className="text-[9px] text-stone-400 font-light">Le bouton « Ajouter au panier » devient « Pré-commander » pour cette pièce</span>
                       </div>
                       <input
                         type="checkbox" className="hidden"
                         checked={isEditing ? !!isEditing.isPreOrder : newProduct.isPreOrder}
                         onChange={e => isEditing ? setIsEditing({...isEditing, isPreOrder: e.target.checked}) : setNewProduct({...newProduct, isPreOrder: e.target.checked})}
                       />
                     </label>
                   </div>

                   {/* VARIANTES DE COULEUR — nom + image + stock par couleur */}
                   <div className="space-y-3 border-t border-stone-100 pt-4">
                     <div className="flex items-center justify-between">
                       <label className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold">Variantes de couleur</label>
                       <button
                         type="button"
                         onClick={() => {
                           const variants = (isEditing ? isEditing.colorVariants : newProduct.colorVariants) || [];
                           const updated = [...variants, { name: '', images: [], stockQuantity: 1 }];
                           if (isEditing) setIsEditing({ ...isEditing, colorVariants: updated });
                           else setNewProduct({ ...newProduct, colorVariants: updated });
                         }}
                         className="text-[9px] uppercase tracking-widest text-stone-500 hover:text-[#C5A059] flex items-center gap-1 transition-colors"
                       >
                         <Plus size={11}/> Ajouter
                       </button>
                     </div>
                     {((isEditing ? isEditing.colorVariants : newProduct.colorVariants) || []).length === 0 ? (
                       <p className="text-[9px] text-stone-300 italic py-2">Aucune variante. Ajoutez les couleurs disponibles avec leur image et stock.</p>
                     ) : (
                       <div className="space-y-3">
                         {((isEditing ? isEditing.colorVariants : newProduct.colorVariants) || []).map((variant: any, vIdx: number) => {
                           const variantImages = getVariantImages(variant);
                           return (
                           <div key={vIdx} className="space-y-3 bg-stone-50 p-3 border border-stone-100">
                             <div className="flex items-start gap-3">
                               <div className="flex-1 space-y-2 min-w-0">
                                 <input
                                   type="text"
                                   placeholder="Nom (ex: Noir, Ivoire)"
                                   value={variant.name}
                                   onChange={(e) => {
                                     const variants = [...((isEditing ? isEditing.colorVariants : newProduct.colorVariants) || [])];
                                     variants[vIdx] = { ...variants[vIdx], name: e.target.value };
                                     if (isEditing) setIsEditing({ ...isEditing, colorVariants: variants });
                                     else setNewProduct({ ...newProduct, colorVariants: variants });
                                   }}
                                   className="w-full border-b border-stone-200 bg-transparent py-1 text-sm focus:border-[#C5A059] outline-none font-light"
                                 />
                                 <div className="flex items-center gap-2">
                                   <span className="text-[9px] uppercase tracking-widest text-stone-400 flex-shrink-0">Stock</span>
                                   <input
                                     type="number"
                                     min="0"
                                     value={variant.stockQuantity}
                                     onChange={(e) => {
                                       const variants = [...((isEditing ? isEditing.colorVariants : newProduct.colorVariants) || [])];
                                       variants[vIdx] = { ...variants[vIdx], stockQuantity: Number(e.target.value) || 0 };
                                       if (isEditing) setIsEditing({ ...isEditing, colorVariants: variants });
                                       else setNewProduct({ ...newProduct, colorVariants: variants });
                                     }}
                                     className="w-20 border-b border-stone-200 bg-transparent py-1 text-sm focus:border-[#C5A059] outline-none font-light"
                                   />
                                 </div>
                               </div>
                               <button
                                 type="button"
                                 onClick={() => {
                                   const variants = [...((isEditing ? isEditing.colorVariants : newProduct.colorVariants) || [])];
                                   variants.splice(vIdx, 1);
                                   if (isEditing) setIsEditing({ ...isEditing, colorVariants: variants });
                                   else setNewProduct({ ...newProduct, colorVariants: variants });
                                 }}
                                 className="text-stone-300 hover:text-red-500 transition-colors flex-shrink-0 mt-1"
                                 aria-label="Retirer cette couleur"
                               >
                                 <Trash2 size={14}/>
                               </button>
                             </div>
                             {/* Galerie d'images de la variante */}
                             <div className="space-y-1.5">
                               <p className="text-[9px] uppercase tracking-widest text-stone-400">Photos de cette couleur</p>
                               <div className="flex flex-wrap gap-2">
                                 {variantImages.map((img: string, imgIdx: number) => (
                                   <div key={imgIdx} className="relative w-16 h-16 bg-white border border-stone-200 overflow-hidden group">
                                     <img src={img} className="w-full h-full object-cover" alt={`${variant.name} ${imgIdx + 1}`} />
                                     <button
                                       type="button"
                                       onClick={() => {
                                         const variants = [...((isEditing ? isEditing.colorVariants : newProduct.colorVariants) || [])];
                                         const nextImages = variantImages.filter((_, i) => i !== imgIdx);
                                         variants[vIdx] = { ...variants[vIdx], images: nextImages };
                                         delete variants[vIdx].image;
                                         if (isEditing) setIsEditing({ ...isEditing, colorVariants: variants });
                                         else setNewProduct({ ...newProduct, colorVariants: variants });
                                       }}
                                       className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                       aria-label="Retirer cette image"
                                     >
                                       <X size={10}/>
                                     </button>
                                   </div>
                                 ))}
                                 <label className="w-16 h-16 bg-white border border-dashed border-stone-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#C5A059] hover:bg-amber-50 transition-colors flex-shrink-0">
                                   <Plus size={14} className="text-stone-400"/>
                                   <span className="text-[8px] uppercase tracking-widest text-stone-400 mt-0.5">Photo</span>
                                   <input
                                     type="file"
                                     accept="image/*"
                                     multiple
                                     className="hidden"
                                     onChange={(e) => {
                                       const files = Array.from(e.target.files || []);
                                       if (files.length === 0) return;
                                       Promise.all(files.map(f => new Promise<string>(resolve => {
                                         const reader = new FileReader();
                                         reader.onload = ev => resolve(ev.target?.result as string);
                                         reader.readAsDataURL(f);
                                       }))).then(newImgs => {
                                         const variants = [...((isEditing ? isEditing.colorVariants : newProduct.colorVariants) || [])];
                                         const currentImgs = getVariantImages(variants[vIdx]);
                                         variants[vIdx] = { ...variants[vIdx], images: [...currentImgs, ...newImgs] };
                                         delete variants[vIdx].image;
                                         if (isEditing) setIsEditing({ ...isEditing, colorVariants: variants });
                                         else setNewProduct({ ...newProduct, colorVariants: variants });
                                       });
                                       e.target.value = '';
                                     }}
                                   />
                                 </label>
                               </div>
                             </div>
                           </div>
                           );
                         })}
                       </div>
                     )}
                   </div>
                   <textarea 
                     placeholder="Histoire et détails de la pièce..." rows={4}
                     value={isEditing ? isEditing.description : newProduct.description}
                     onChange={e => isEditing ? setIsEditing({...isEditing, description: e.target.value}) : setNewProduct({...newProduct, description: e.target.value})}
                     className="w-full border border-stone-50 bg-stone-50 p-3 text-sm outline-none focus:border-[#C5A059] transition-all font-light"
                   />
                   <div className="space-y-2">
                     <label className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold">Photos</label>
                     <div
                       onDrop={(e) => { setIsDragging(false); handleFileChange(e); }}
                       onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                       onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                       onDragLeave={() => setIsDragging(false)}
                       onClick={() => document.getElementById('photoInput')?.click()}
                       className={`w-full border-2 border-dashed rounded-sm py-6 flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? 'border-[#C5A059] bg-amber-50' : 'border-stone-200 hover:border-stone-400'}`}
                     >
                       {isUploading ? (
                         <p className="text-[10px] uppercase tracking-widest text-stone-400">Chargement...</p>
                       ) : (
                         <>
                           <p className="text-[10px] uppercase tracking-widest text-stone-400">{isDragging ? 'Déposer ici' : 'Glisser les photos ici'}</p>
                           <p className="text-[9px] text-stone-300 mt-1">ou cliquer pour parcourir</p>
                         </>
                       )}
                     </div>
                     <input id="photoInput" type="file" multiple onChange={handleFileChange} className="hidden" accept="image/*" />
                     <div className="grid grid-cols-4 gap-2 mt-2">
                       {(isEditing ? (isEditing.images || []) : newProduct.images).map((img: string, idx: number) => (
                         <div key={idx} className="relative aspect-square bg-stone-100 group overflow-hidden border">
                           <img src={img} className="w-full h-full object-cover" alt="" />
                           <button type="button" onClick={() => removeImage(idx)} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <Trash2 size={16} />
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
                 <div className="flex gap-2 pt-4">
                   <button type="submit" className="flex-1 bg-stone-900 text-white py-4 text-[10px] uppercase tracking-widest hover:bg-[#C5A059] transition-all">
                     {isEditing ? 'Mettre à jour' : 'Enregistrer'}
                   </button>
                   {isEditing && (
                     <button type="button" onClick={() => setIsEditing(null)} className="px-4 border border-stone-200 text-stone-400 hover:text-black">
                       <X size={18} />
                     </button>
                   )}
                 </div>
               </form>
             </div>

             {/* LISTE PRODUITS ADMIN */}
             <div className="lg:col-span-7">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {products.length === 0 ? (
                   <div className="col-span-2 py-20 text-center border-2 border-dashed border-stone-200 text-stone-300 uppercase tracking-widest text-[10px]">Aucune pièce en ligne</div>
                 ) : products.map(p => {
                   const isSoldOut = p.stockQuantity !== undefined && p.stockQuantity <= 0;
                   const isPub = p.isPublished === true;
                   return (
                   <div key={p.id} className={`bg-white p-5 shadow-sm border flex gap-5 group hover:border-[#C5A059]/30 transition-all relative ${isPub ? 'border-stone-100' : 'border-amber-200 bg-amber-50/30'}`}>
                     {!isPub && (
                       <div className="absolute top-2 right-2 bg-amber-500 text-white px-2 py-0.5 text-[8px] uppercase tracking-widest font-medium shadow-sm">Brouillon</div>
                     )}
                     <div className="w-20 h-28 bg-stone-50 overflow-hidden flex-shrink-0 relative">
                       <img src={p.images?.[0]} className={`w-full h-full object-cover ${isSoldOut ? 'grayscale opacity-70' : ''} ${!isPub ? 'opacity-60' : ''}`} alt="" />
                       {isSoldOut && <div className="absolute inset-0 bg-red-900/10 flex items-center justify-center"><X size={16} className="text-red-600"/></div>}
                     </div>
                     <div className="flex-1 flex flex-col justify-between min-w-0">
                       <div>
                         <h4 className="font-serif text-lg leading-tight">{p.name}</h4>
                         <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-2">{p.category}</p>
                         <p className="text-xs font-bold text-[#C5A059] mt-1">{p.price} $</p>
                       </div>
                       <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-stone-50 pt-3 items-center">
                         <span className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded-sm ${isSoldOut ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                           Stock : {p.stockQuantity !== undefined ? p.stockQuantity : '∞'}
                         </span>
                         <button
                           onClick={async () => {
                             await fetch(`/api/admin/inventory/${p.id}`, {
                               method: 'PATCH',
                               headers: {
                                 'Content-Type': 'application/json',
                                 'x-admin-password': adminSessionPassword,
                               },
                               body: JSON.stringify({ isPublished: !isPub }),
                             });
                           }}
                           className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded-sm transition-colors ${isPub ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                         >
                           {isPub ? '● En ligne' : '○ Hors ligne'}
                         </button>
                         <button onClick={() => {
                           // Migration auto: si l'ancien format (colors string) sans colorVariants -> convertir
                           const migrated = { ...p };
                           if (!Array.isArray(p.colorVariants) || p.colorVariants.length === 0) {
                             const oldColors = (p.colors || '').split(',').map((c: string) => c.trim()).filter(Boolean);
                             if (oldColors.length > 0) {
                               const fallbackImage = p.images?.[0] || '';
                               const totalStock = p.stockQuantity ?? 0;
                               const baseShare = Math.floor(totalStock / oldColors.length);
                               const remainder = totalStock - (baseShare * oldColors.length);
                               migrated.colorVariants = oldColors.map((name: string, i: number) => ({
                                 name,
                                 images: fallbackImage ? [fallbackImage] : [],
                                 stockQuantity: baseShare + (i < remainder ? 1 : 0),
                               }));
                             } else {
                               migrated.colorVariants = [];
                             }
                           }
                           setIsEditing(migrated);
                         }} className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-900 flex items-center gap-1"><Settings size={10}/> Modif.</button>
                         <button onClick={() => deleteProduct(p.id)} className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={10}/> Suppr.</button>
                       </div>
                     </div>
                   </div>
                 )})}
               </div>
             </div>
           </div>
          ) : adminTab === 'clients' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-500">

              {/* COLONNE GAUCHE : LISTE DES COMMANDES */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl flex items-center gap-2"><Users size={18}/> Commandes</h3>
                  {clients.length > 0 && (
                    <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest">
                      <span className="text-amber-600 font-medium">{clients.filter(c => c.statut !== 'Expédié').length} à préparer</span>
                      <span className="text-stone-300">·</span>
                      <span className="text-green-700">{clients.filter(c => c.statut === 'Expédié').length} expédié{clients.filter(c => c.statut === 'Expédié').length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {/* BARRE DE RECHERCHE */}
                <div className="flex items-center gap-3 bg-white border border-stone-200 px-4 py-3 shadow-sm focus-within:border-[#C5A059] transition-colors">
                  <Search size={14} className="text-stone-300 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Rechercher par nom ou courriel..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="flex-1 outline-none text-sm font-light text-stone-700 placeholder:text-stone-300 bg-transparent"
                  />
                  {clientSearch && (
                    <button onClick={() => setClientSearch('')} className="text-stone-300 hover:text-stone-600 transition-colors"><X size={14}/></button>
                  )}
                </div>

                {/* LISTE */}
                {clients.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-stone-200 text-stone-300 text-[10px] uppercase tracking-widest">
                    Aucune commande reçue
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
                    {clients
                      .filter(c => {
                        const q = clientSearch.toLowerCase();
                        return !q || (c.nom || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
                      })
                      .slice()
                      .sort((a, b) => {
                        // À préparer en premier, puis par date décroissante
                        const aReady = a.statut !== 'Expédié' ? 0 : 1;
                        const bReady = b.statut !== 'Expédié' ? 0 : 1;
                        if (aReady !== bReady) return aReady - bReady;
                        return new Date(b.derniereCommande || 0).getTime() - new Date(a.derniereCommande || 0).getTime();
                      })
                      .map(client => {
                        const isSelected = trackingForm.commandeId === client.id;
                        const isExpedié = client.statut === 'Expédié';
                        return (
                          <button
                            key={client.id}
                            onClick={() => setTrackingForm({
                              ...trackingForm,
                              commandeId: client.id,
                              email: client.email || '',
                              name: client.nom || '',
                              produits: client.produits || ''
                            })}
                            className={`w-full text-left bg-white p-4 border-l-4 border-r border-t border-b transition-all shadow-sm hover:shadow-md ${
                              isSelected
                                ? 'border-l-[#C5A059] border-r-[#C5A059]/20 border-t-[#C5A059]/20 border-b-[#C5A059]/20 bg-[#C5A059]/5'
                                : isExpedié
                                  ? 'border-l-green-300 border-r-stone-100 border-t-stone-100 border-b-stone-100'
                                  : 'border-l-amber-400 border-r-stone-100 border-t-stone-100 border-b-stone-100'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-serif text-base truncate">{client.nom || '—'}</p>
                                <p className="text-[10px] text-stone-400 mt-0.5 truncate">{client.email}</p>
                                {client.telephone && (
                                  <a
                                    href={`tel:${client.telephone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] text-stone-500 mt-0.5 truncate flex items-center gap-1 hover:text-[#C5A059] transition-colors"
                                  >
                                    <span>📞</span>{client.telephone}
                                  </a>
                                )}
                                {client.adresseLivraison && (
                                  <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([
                                      client.adresseLivraison.ligne1,
                                      client.adresseLivraison.ligne2,
                                      client.adresseLivraison.ville,
                                      client.adresseLivraison.province,
                                      client.adresseLivraison.codePostal,
                                      client.adresseLivraison.pays
                                    ].filter(Boolean).join(', '))}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="block mt-1.5 px-2 py-1.5 bg-stone-50 hover:bg-amber-50 border border-stone-100 hover:border-[#C5A059]/30 transition-colors group/addr"
                                  >
                                    <p className="text-[8px] uppercase tracking-widest text-stone-400 group-hover/addr:text-[#C5A059] mb-0.5">📦 Adresse livraison</p>
                                    <p className="text-[10px] text-stone-700 leading-snug">
                                      {client.adresseLivraison.ligne1}
                                      {client.adresseLivraison.ligne2 && <>, {client.adresseLivraison.ligne2}</>}
                                      <br />
                                      {[client.adresseLivraison.ville, client.adresseLivraison.province, client.adresseLivraison.codePostal].filter(Boolean).join(', ')}
                                      {client.adresseLivraison.pays && <> · {client.adresseLivraison.pays}</>}
                                    </p>
                                  </a>
                                )}
                                {client.produits && (
                                  <p className="text-[10px] text-stone-400 mt-1.5 truncate italic">{client.produits}</p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                <span className={`text-[8px] uppercase tracking-widest px-2 py-1 font-medium whitespace-nowrap ${isExpedié ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                  {client.statut || 'À préparer'}
                                </span>
                                {client.totalDepense != null && (
                                  <span className="text-xs font-light text-[#C5A059]">{client.totalDepense} $</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              {client.derniereCommande ? (
                                <p className="text-[9px] text-stone-300 flex items-center gap-1.5">
                                  <Clock size={10} />
                                  {new Date(client.derniereCommande).toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                              ) : <span />}
                              {isExpedié && client.trackingNumber && (
                                <p className="text-[9px] text-green-600 flex items-center gap-1.5">
                                  <Truck size={10} /> {client.trackingNumber}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* COLONNE DROITE : FORMULAIRE + HISTORIQUE */}
              <div className="lg:col-span-7 space-y-8">

                {/* FORMULAIRE D'EXPÉDITION */}
                <form onSubmit={sendTrackingEmail} className="bg-white p-8 shadow-sm border border-stone-100 space-y-6 sticky top-12">
                  <h3 className="font-serif text-xl border-b pb-4 flex items-center gap-2">
                    <Truck size={18}/> Envoyer un suivi d'expédition
                  </h3>

                  {/* COMMANDE SÉLECTIONNÉE */}
                  {trackingForm.commandeId ? (
                    <div className="bg-[#C5A059]/5 border border-[#C5A059]/20 px-4 py-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-[#C5A059] font-medium">Commande sélectionnée</p>
                        <p className="text-sm font-light mt-1">{trackingForm.name}</p>
                        <p className="text-[10px] text-stone-400">{trackingForm.email}</p>
                        {trackingForm.produits && <p className="text-[10px] text-stone-400 mt-0.5 italic">{trackingForm.produits}</p>}
                      </div>
                      <button type="button" onClick={() => setTrackingForm({ email: '', name: '', carrier: 'Poste Canada', trackingNumber: '', commandeId: '', produits: '' })} className="text-stone-300 hover:text-stone-600 transition-colors flex-shrink-0 mt-0.5">
                        <X size={14}/>
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-stone-100 px-4 py-5 text-center">
                      <p className="text-[10px] uppercase tracking-widest text-stone-300">← Sélectionnez une commande dans la liste</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-[0.2em] text-[#C5A059] font-medium">Nom du client</label>
                        <input
                          type="text" required
                          value={trackingForm.name}
                          onChange={e => setTrackingForm({...trackingForm, name: e.target.value})}
                          className="w-full border-b border-stone-200 py-2 focus:border-[#C5A059] outline-none font-light text-sm transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-[0.2em] text-[#C5A059] font-medium">Courriel</label>
                        <input
                          type="email" required
                          value={trackingForm.email}
                          onChange={e => setTrackingForm({...trackingForm, email: e.target.value})}
                          className="w-full border-b border-stone-200 py-2 focus:border-[#C5A059] outline-none font-light text-sm transition-colors"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-[0.2em] text-[#C5A059] font-medium">Transporteur</label>
                        <select
                          value={trackingForm.carrier}
                          onChange={e => setTrackingForm({...trackingForm, carrier: e.target.value})}
                          className="w-full border-b border-stone-200 py-2 focus:border-[#C5A059] outline-none font-light text-sm bg-transparent transition-colors"
                        >
                          <option>Poste Canada</option>
                          <option>UPS</option>
                          <option>FedEx</option>
                          <option>Purolator</option>
                          <option>DHL</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-[0.2em] text-[#C5A059] font-medium">Numéro de suivi</label>
                        <input
                          type="text" required
                          placeholder="ex: 1234 5678 9012"
                          value={trackingForm.trackingNumber}
                          onChange={e => setTrackingForm({...trackingForm, trackingNumber: e.target.value})}
                          className="w-full border-b border-stone-200 py-2 focus:border-[#C5A059] outline-none font-light text-sm transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-[0.2em] text-[#C5A059] font-medium">Produits expédiés</label>
                      <input
                        type="text"
                        placeholder="ex: Sac à main Noir, Pochette Camel"
                        value={trackingForm.produits}
                        onChange={e => setTrackingForm({...trackingForm, produits: e.target.value})}
                        className="w-full border-b border-stone-200 py-2 focus:border-[#C5A059] outline-none font-light text-sm transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={isSendingTracking || !trackingForm.commandeId || !trackingForm.trackingNumber}
                      className="flex-1 bg-stone-900 text-white py-4 text-[10px] uppercase tracking-widest hover:bg-[#C5A059] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-stone-900"
                    >
                      {isSendingTracking
                        ? <><Loader2 size={14} className="animate-spin" /> Envoi en cours…</>
                        : <><Send size={14} /> Envoyer le suivi</>
                      }
                    </button>
                    {trackingStatus === 'success' && (
                      <div className="flex items-center gap-2 text-green-600 text-[10px] uppercase tracking-widest flex-shrink-0">
                        <CheckCircle2 size={16} /> Envoyé !
                      </div>
                    )}
                    {trackingStatus === 'error' && (
                      <div className="text-red-500 text-[10px] uppercase tracking-widest flex-shrink-0">Erreur</div>
                    )}
                  </div>
                </form>

                {/* HISTORIQUE DES EXPÉDITIONS */}
                {trackings.length > 0 && (
                  <div className="bg-white p-8 shadow-sm border border-stone-100">
                    <h4 className="font-serif text-lg border-b pb-4 mb-6 flex items-center gap-2">
                      <Package size={16}/> Historique des expéditions
                      <span className="ml-auto text-[9px] uppercase tracking-widest text-stone-400 font-sans">{trackings.length} envoi{trackings.length > 1 ? 's' : ''}</span>
                    </h4>
                    <div className="space-y-0 divide-y divide-stone-50">
                      {trackings
                        .slice()
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(t => (
                          <div key={t.id} className="flex gap-4 py-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059] mt-2 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-light">{t.name}</p>
                                  <p className="text-[10px] text-stone-400 truncate">{t.email}</p>
                                </div>
                                <span className="text-[9px] uppercase tracking-widest text-stone-300 flex-shrink-0">
                                  {new Date(t.date).toLocaleDateString('fr-CA')}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <span className="text-[9px] uppercase tracking-widest text-stone-400">{t.carrier}</span>
                                <span className="font-mono text-[10px] text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5">{t.trackingNumber}</span>
                              </div>
                              {t.produits && <p className="text-[10px] text-stone-400 mt-1 italic truncate">{t.produits}</p>}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : adminTab === 'promos' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-500">

              {/* COLONNE GAUCHE : FORMULAIRE NOUVEAU CODE */}
              <div className="lg:col-span-5">
                <form onSubmit={createPromoCode} className="bg-white p-8 shadow-sm border border-stone-100 space-y-6 sticky top-12 rounded-sm">
                  <h3 className="font-serif text-xl border-b pb-4 flex items-center gap-2">
                    <PlusCircle size={18}/> Nouveau code promo
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-[0.3em] text-stone-400">Code</label>
                    <input
                      type="text"
                      placeholder="EX: BIENVENUE10"
                      required
                      value={newPromo.code}
                      onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                      className="w-full border-b py-2 focus:border-[#C5A059] outline-none font-light tracking-wider"
                    />
                    <p className="text-[9px] text-stone-400 font-light">Au moins 3 caractères. Sera converti en majuscules.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-[0.3em] text-stone-400">Réduction (%)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      placeholder="10"
                      required
                      value={newPromo.percentOff}
                      onChange={(e) => setNewPromo({ ...newPromo, percentOff: e.target.value })}
                      className="w-full border-b py-2 focus:border-[#C5A059] outline-none font-light"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-[0.3em] text-stone-400">Limite d'utilisations <span className="text-stone-300 normal-case tracking-normal">(optionnel)</span></label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      placeholder="Illimité"
                      value={newPromo.maxRedemptions}
                      onChange={(e) => setNewPromo({ ...newPromo, maxRedemptions: e.target.value })}
                      className="w-full border-b py-2 focus:border-[#C5A059] outline-none font-light"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-[0.3em] text-stone-400">Date d'expiration <span className="text-stone-300 normal-case tracking-normal">(optionnel)</span></label>
                    <input
                      type="date"
                      value={newPromo.expiresAt}
                      onChange={(e) => setNewPromo({ ...newPromo, expiresAt: e.target.value })}
                      className="w-full border-b py-2 focus:border-[#C5A059] outline-none font-light"
                    />
                  </div>

                  {promoFormError && (
                    <p className="text-[10px] uppercase tracking-[0.2em] text-red-600 font-light">{promoFormError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isCreatingPromo}
                    className="w-full bg-stone-900 text-white py-4 text-[10px] uppercase tracking-[0.3em] font-medium hover:bg-[#C5A059] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCreatingPromo ? <Loader2 size={14} className="animate-spin"/> : <PlusCircle size={14}/>}
                    {isCreatingPromo ? 'Création…' : 'Créer le code'}
                  </button>
                </form>
              </div>

              {/* COLONNE DROITE : LISTE DES CODES */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl">Codes existants</h3>
                  <button
                    onClick={fetchPromoCodes}
                    disabled={isLoadingPromos}
                    className="text-[10px] uppercase tracking-widest text-stone-500 hover:text-black transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={isLoadingPromos ? 'animate-spin' : ''}/> Actualiser
                  </button>
                </div>

                {isLoadingPromos && promoCodes.length === 0 ? (
                  <div className="bg-white p-12 text-center border border-stone-100">
                    <Loader2 size={20} className="animate-spin mx-auto text-stone-400"/>
                  </div>
                ) : promoCodes.length === 0 ? (
                  <div className="bg-white p-12 text-center border border-stone-100">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-stone-400 font-light">Aucun code promo créé</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {promoCodes.map((p) => {
                      const expired = p.expiresAt && p.expiresAt * 1000 < Date.now();
                      const maxedOut = p.maxRedemptions && p.timesRedeemed >= p.maxRedemptions;
                      const isUsable = p.active && !expired && !maxedOut;
                      return (
                        <div key={p.id} className="bg-white p-5 border border-stone-100 flex items-center justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <p className="font-mono text-base tracking-widest font-medium">{p.code}</p>
                              <span className="text-[10px] uppercase tracking-widest text-[#C5A059] font-medium">{p.percentOff}% off</span>
                              {!isUsable && (
                                <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full">
                                  {!p.active ? 'Désactivé' : expired ? 'Expiré' : 'Épuisé'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-stone-500 font-light flex-wrap">
                              <span>{p.timesRedeemed} utilisation{p.timesRedeemed !== 1 ? 's' : ''}{p.maxRedemptions ? ` / ${p.maxRedemptions}` : ''}</span>
                              {p.expiresAt && (
                                <>
                                  <span className="text-stone-300">·</span>
                                  <span>Expire le {new Date(p.expiresAt * 1000).toLocaleDateString('fr-CA')}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {p.active ? (
                              <button
                                onClick={() => togglePromoCode(p.id, false)}
                                className="text-[10px] uppercase tracking-widest text-stone-500 hover:text-black transition-colors px-3 py-2 border border-stone-200"
                              >
                                Désactiver
                              </button>
                            ) : (
                              <button
                                onClick={() => togglePromoCode(p.id, true)}
                                className="text-[10px] uppercase tracking-widest text-[#C5A059] hover:text-black transition-colors px-3 py-2 border border-[#C5A059]/40"
                              >
                                Réactiver
                              </button>
                            )}
                            <button
                              onClick={() => deletePromoCode(p.id)}
                              className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-red-600 flex items-center gap-1 px-2 py-2"
                              title="Supprimer"
                            >
                              <Trash2 size={12}/>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-500">

              {/* COLONNE GAUCHE : FORMULAIRE BOUTIQUE */}
              <div className="lg:col-span-5">
                <form onSubmit={saveRetailer} className="bg-white p-8 shadow-sm border border-stone-100 space-y-6 sticky top-12 rounded-sm">
                  <h3 className="font-serif text-xl border-b pb-4 flex items-center gap-2">
                    {editingRetailer ? <Settings size={18}/> : <PlusCircle size={18}/>}
                    {editingRetailer ? 'Modifier la boutique' : 'Ajouter une boutique'}
                  </h3>
                  <p className="text-[11px] text-stone-400 font-light leading-relaxed -mt-2">
                    Ajoutez les boutiques et points de vente où vos sacs sont disponibles. Elles s&apos;affichent automatiquement dans la section « Disponible en boutique » du site.
                  </p>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-stone-500 block mb-2">Nom de la boutique *</label>
                    <input
                      type="text"
                      value={editingRetailer ? editingRetailer.name : newRetailer.name}
                      onChange={e => editingRetailer ? setEditingRetailer({ ...editingRetailer, name: e.target.value }) : setNewRetailer({ ...newRetailer, name: e.target.value })}
                      placeholder="Ex : Salon Uforia"
                      className="w-full border border-stone-200 px-4 py-3 text-sm font-light outline-none focus:border-[#C5A059] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-stone-500 block mb-2">Lien (Facebook, site web…)</label>
                    <input
                      type="url"
                      value={editingRetailer ? (editingRetailer.url || '') : newRetailer.url}
                      onChange={e => editingRetailer ? setEditingRetailer({ ...editingRetailer, url: e.target.value }) : setNewRetailer({ ...newRetailer, url: e.target.value })}
                      onBlur={e => {
                        const normalized = normalizeRetailerUrl(e.target.value);
                        if (normalized === e.target.value) return;
                        editingRetailer ? setEditingRetailer({ ...editingRetailer, url: normalized }) : setNewRetailer({ ...newRetailer, url: normalized });
                      }}
                      placeholder="https://www.facebook.com/..."
                      className="w-full border border-stone-200 px-4 py-3 text-sm font-light outline-none focus:border-[#C5A059] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-stone-500 block mb-2">Logo / photo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 flex-shrink-0 border border-stone-200 rounded-sm bg-stone-50 flex items-center justify-center overflow-hidden">
                        {(editingRetailer ? editingRetailer.logo : newRetailer.logo) ? (
                          <img src={editingRetailer ? editingRetailer.logo : newRetailer.logo} alt="Aperçu" className="w-full h-full object-contain p-1" />
                        ) : (
                          <Package size={20} className="text-stone-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="cursor-pointer inline-flex items-center gap-2 border border-stone-200 px-4 py-2 text-[10px] uppercase tracking-widest hover:border-[#C5A059] transition-colors">
                          {isUploadingRetailerLogo ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14}/>}
                          {isUploadingRetailerLogo ? 'Chargement…' : 'Téléverser'}
                          <input type="file" accept="image/*" onChange={handleRetailerLogoChange} className="hidden" />
                        </label>
                        {(editingRetailer ? editingRetailer.logo : newRetailer.logo) && (
                          <button
                            type="button"
                            onClick={() => editingRetailer ? setEditingRetailer({ ...editingRetailer, logo: '' }) : setNewRetailer({ ...newRetailer, logo: '' })}
                            className="block text-[10px] uppercase tracking-widest text-stone-400 hover:text-red-700 transition-colors"
                          >
                            Retirer le logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {retailerFormError && <p className="text-red-600 text-xs">{retailerFormError}</p>}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingRetailer}
                      className="flex-1 bg-stone-900 text-white py-3 text-[10px] uppercase tracking-widest hover:bg-[#C5A059] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSavingRetailer && <Loader2 size={14} className="animate-spin"/>}
                      {editingRetailer ? 'Enregistrer' : 'Ajouter la boutique'}
                    </button>
                    {editingRetailer && (
                      <button
                        type="button"
                        onClick={() => { setEditingRetailer(null); setRetailerFormError(''); }}
                        className="px-6 py-3 text-[10px] uppercase tracking-widest border border-stone-200 hover:bg-stone-50 transition-all"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* COLONNE DROITE : LISTE DES BOUTIQUES */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h3 className="font-serif text-xl flex items-center gap-2"><LayoutGrid size={18}/> Boutiques ({retailers.length})</h3>
                  {retailers.length === 0 && (
                    <button
                      onClick={seedDefaultRetailers}
                      disabled={isSeedingRetailers}
                      className="inline-flex items-center gap-2 bg-[#C5A059] text-white px-4 py-2 text-[10px] uppercase tracking-widest hover:bg-stone-900 transition-all disabled:opacity-50"
                    >
                      {isSeedingRetailers ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>}
                      Importer les boutiques actuelles
                    </button>
                  )}
                </div>

                {retailers.length === 0 ? (
                  <div className="bg-white border border-dashed border-stone-200 p-10 text-center rounded-sm">
                    <p className="text-sm text-stone-400 font-light">Aucune boutique enregistrée pour l&apos;instant.</p>
                    <p className="text-xs text-stone-400 font-light mt-2">
                      Cliquez sur « Importer les boutiques actuelles » pour récupérer les {defaultRetailers.length} boutiques déjà affichées sur le site, puis modifiez-les à votre guise.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {retailers.map((shop) => (
                      <div key={shop.id} className="bg-white border border-stone-100 shadow-sm rounded-sm p-4 flex items-center gap-4">
                        <div className="w-16 h-16 flex-shrink-0 border border-stone-100 rounded-sm bg-stone-50 flex items-center justify-center overflow-hidden">
                          {shop.logo ? (
                            <img src={shop.logo} alt={shop.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <Package size={18} className="text-stone-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-serif text-base text-stone-900 truncate">{shop.name}</h4>
                          {shop.url && (
                            <a href={shop.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-stone-400 hover:text-[#C5A059] transition-colors truncate block">
                              {shop.url}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => { setEditingRetailer(shop); setRetailerFormError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="p-2 text-stone-400 hover:text-[#C5A059] transition-colors"
                            aria-label="Modifier"
                          >
                            <Settings size={16}/>
                          </button>
                          <button
                            onClick={() => deleteRetailer(shop.id)}
                            className="p-2 text-stone-400 hover:text-red-700 transition-colors"
                            aria-label="Supprimer"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    );
  }

  // --- IMAGES À AFFICHER : si une couleur est sélectionnée et a ses propres images, on les met en premier
  const displayImages: string[] = (() => {
    if (!selectedProduct) return [];
    const base: string[] = selectedProduct.images || [];
    if (!Array.isArray(selectedProduct.colorVariants)) return base;
    const variant = selectedProduct.colorVariants.find((v: any) => v.name === selectedColor);
    const variantImgs = getVariantImages(variant).filter((img: string) => !base.includes(img));
    if (variantImgs.length > 0) {
      return [...variantImgs, ...base];
    }
    return base;
  })();

  // --- RENDU BOUTIQUE ---
  return (
    <div className={`min-h-screen bg-[#FDFCFB] text-[#1C1C1C] font-sans selection:bg-[#C5A059] selection:text-white ${showCheckout ? 'cursor-auto-mode' : ''}`} style={{ cursor: showCheckout ? 'auto' : 'none' }}>

      {/* ANIMATIONS GLOBALES */}
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes scroll-line { 0% { transform: translateY(-100%); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(200%); opacity: 0; } }
        @keyframes slideUp { from { transform: translateY(110%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes drawLine { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes revealRight { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0% 0 0); } }
        @keyframes kb1 { 0% { transform: scale(1) translate(0,0); } 100% { transform: scale(1.12) translate(-1.5%,-2%); } }
        @keyframes kb2 { 0% { transform: scale(1.06) translate(2%,1%); } 100% { transform: scale(1) translate(0,0); } }
        @keyframes kb3 { 0% { transform: scale(1) translate(-1%,2%); } 100% { transform: scale(1.1) translate(1%,-1%); } }
        .hero-kb { animation: var(--kb-anim); }
        .text-shimmer { background: linear-gradient(135deg, #C5A059 0%, #E8C97A 55%, #B8913A 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        * { cursor: none !important; }
        .cursor-auto-mode, .cursor-auto-mode * { cursor: auto !important; }
        .cursor-auto-mode a, .cursor-auto-mode button, .cursor-auto-mode [role="button"] { cursor: pointer !important; }
        .cursor-auto-mode input, .cursor-auto-mode textarea { cursor: text !important; }
      `}</style>

      {/* GRAIN OVERLAY */}
      <div className="pointer-events-none fixed inset-0 z-[9990] opacity-[0.022]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '200px' }} />

      {/* BARRE DE PROGRESSION SCROLL */}
      <div className="fixed top-0 left-0 z-[201] h-[1px] bg-gradient-to-r from-[#C5A059] to-[#F0D68A] transition-[width] duration-150 ease-out" style={{ width: `${scrollProgress}%` }} />

      {/* CURSEUR CUSTOM (caché pendant le checkout) */}
      {!showCheckout && <CustomCursor />}

      {/* MODALE HISTOIRE D'UNE FEMME */}
      <AnimatePresence>
        {selectedInspiration && (
          <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => setSelectedInspiration(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="relative w-full max-w-5xl bg-[#0F0F0F] flex flex-col md:flex-row overflow-hidden max-h-[92vh]"
            >
              <button
                className="absolute top-5 right-5 z-50 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-colors"
                onClick={() => setSelectedInspiration(null)}
                aria-label={t.close}
              >
                <X size={18} />
              </button>

              <div className="w-full md:w-1/2 bg-stone-900 overflow-hidden flex items-center justify-center">
                <img
                  src={selectedInspiration.src}
                  className="block w-full h-auto max-h-[55vh] object-contain md:h-full md:max-h-none md:object-cover"
                  alt={selectedInspiration.name}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.15'; }}
                />
              </div>

              <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-center space-y-8 overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-[1px] bg-[#C5A059]" />
                    <p className="text-[9px] uppercase tracking-[0.5em] text-[#C5A059]">{t.muse}</p>
                  </div>
                  <h2 className="font-serif text-4xl md:text-6xl text-white italic leading-none">{selectedInspiration.name}</h2>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 pt-1">{lang === 'en' ? selectedInspiration.bagEn : selectedInspiration.bag}</p>
                </div>

                <div className="w-12 h-[1px] bg-[#C5A059]/30" />

                <p className="font-serif text-white/80 leading-[2] text-sm md:text-base">
                  {lang === 'en' ? selectedInspiration.storyEn : selectedInspiration.story}
                </p>

                <div className="pt-2">
                  <p className="text-[8px] uppercase tracking-[0.4em] text-[#C5A059]/50">{t.houseSignature}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE PAIEMENT SQUARE */}
      {showCheckout && (() => {
        const subtotal = cart.reduce((a, b) => a + (b.price * b.quantity), 0);
        const shipping = shippingFor(subtotal);
        const rate = estimateTaxRate(checkoutForm.country, checkoutForm.province);
        const estTax = (subtotal + shipping) * rate / 100;
        const estTotal = subtotal + shipping + estTax;
        const inputCls = "w-full border border-stone-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#C5A059] transition-colors";
        const labelCls = "block text-[10px] uppercase tracking-widest text-stone-500 mb-1.5";
        return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={closeCheckout} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 overflow-hidden rounded-sm">
            <div className="p-4 border-b flex justify-between items-center bg-stone-50">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#C5A059] font-medium">
                <Lock size={12} /> {t.secureTransaction}
              </div>
              <button onClick={closeCheckout}><X size={20}/></button>
            </div>

            {orderResult ? (
              /* --- CONFIRMATION --- */
              <div className="p-10 text-center bg-stone-50">
                <CheckCircle2 size={48} strokeWidth={1} className="mx-auto text-[#C5A059] mb-6" />
                <h3 className="font-serif text-2xl uppercase tracking-widest mb-3">Merci !</h3>
                <p className="text-sm text-stone-600 leading-relaxed mb-2">Votre paiement de <strong>{orderResult.amount.toFixed(2)} $ CAD</strong> a été confirmé.</p>
                <p className="text-xs text-stone-500 mb-6">Un courriel de confirmation vous a été envoyé.</p>
                {orderResult.receiptUrl && (
                  <a href={orderResult.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-[10px] uppercase tracking-widest text-[#C5A059] border border-[#C5A059] px-6 py-3 hover:bg-[#C5A059] hover:text-white transition-colors mb-4">Voir mon reçu</a>
                )}
                <div>
                  <button onClick={closeCheckout} className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-black transition-colors mt-2">Fermer</button>
                </div>
              </div>
            ) : (
              /* --- FORMULAIRE --- */
              <div className="p-6 md:p-8 overflow-y-auto max-h-[82vh] bg-stone-50 space-y-5">
                {/* Résumé */}
                <div className="bg-white border border-stone-200 p-4 space-y-1.5">
                  {cart.map(item => (
                    <div key={item.cartItemId} className="flex justify-between text-xs text-stone-600">
                      <span>{item.quantity}× {item.name}{item.selectedColor ? ` (${item.selectedColor})` : ''}</span>
                      <span>{(item.price * item.quantity).toFixed(2)} $</span>
                    </div>
                  ))}
                  <div className="border-t border-stone-100 pt-2 mt-2 space-y-1">
                    <div className="flex justify-between text-xs text-stone-500"><span>Sous-total</span><span>{subtotal.toFixed(2)} $</span></div>
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>Livraison</span>
                      <span>{shipping > 0 ? `${shipping.toFixed(2)} $` : 'Gratuite'}</span>
                    </div>
                    <div className="flex justify-between text-xs text-stone-500"><span>Taxes estimées{rate > 0 ? ` (${rate}%)` : ''}</span><span>{estTax.toFixed(2)} $</span></div>
                    <div className="flex justify-between text-sm font-medium pt-1"><span>Total estimé</span><span className="text-[#C5A059]">{estTotal.toFixed(2)} $ CAD</span></div>
                  </div>
                  {shipping > 0 && (
                    <p className="text-[10px] text-[#C5A059] pt-1">Ajoutez {(FREE_SHIPPING_MIN - subtotal).toFixed(2)} $ pour la livraison gratuite.</p>
                  )}
                  <p className="text-[9px] text-stone-400 pt-1">Taxes et rabais finaux calculés selon la province de livraison.</p>
                </div>

                {/* Coordonnées */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className={labelCls}>Nom complet *</label>
                    <input className={inputCls} value={checkoutForm.name} onChange={e => setCheckoutForm({ ...checkoutForm, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Courriel *</label>
                      <input type="email" className={inputCls} value={checkoutForm.email} onChange={e => setCheckoutForm({ ...checkoutForm, email: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Téléphone</label>
                      <input type="tel" className={inputCls} value={checkoutForm.phone} onChange={e => setCheckoutForm({ ...checkoutForm, phone: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Adresse de livraison */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className={labelCls}>Adresse *</label>
                    <input className={inputCls} value={checkoutForm.line1} onChange={e => setCheckoutForm({ ...checkoutForm, line1: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Appartement, suite (optionnel)</label>
                    <input className={inputCls} value={checkoutForm.line2} onChange={e => setCheckoutForm({ ...checkoutForm, line2: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Ville *</label>
                      <input className={inputCls} value={checkoutForm.city} onChange={e => setCheckoutForm({ ...checkoutForm, city: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Code postal *</label>
                      <input className={inputCls} value={checkoutForm.postalCode} onChange={e => setCheckoutForm({ ...checkoutForm, postalCode: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Pays *</label>
                      <select className={inputCls} value={checkoutForm.country} onChange={e => setCheckoutForm({ ...checkoutForm, country: e.target.value })}>
                        <option value="CA">Canada</option>
                        <option value="US">États-Unis</option>
                        <option value="FR">France</option>
                        <option value="BE">Belgique</option>
                        <option value="CH">Suisse</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Province / État</label>
                      {checkoutForm.country === 'CA' ? (
                        <select className={inputCls} value={checkoutForm.province} onChange={e => setCheckoutForm({ ...checkoutForm, province: e.target.value })}>
                          {CA_PROVINCES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                        </select>
                      ) : (
                        <input className={inputCls} value={checkoutForm.province} onChange={e => setCheckoutForm({ ...checkoutForm, province: e.target.value })} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Code promo */}
                <div>
                  <label className={labelCls}>Code promo (optionnel)</label>
                  <input className={inputCls} value={checkoutForm.promoCode} onChange={e => setCheckoutForm({ ...checkoutForm, promoCode: e.target.value.toUpperCase() })} placeholder="Ex. BIENVENUE10" />
                </div>

                {/* Carte Square */}
                <div>
                  <label className={labelCls}>Carte de crédit *</label>
                  <div id="sq-card" className="border border-stone-300 bg-white p-3 min-h-[52px]" />
                </div>

                {checkoutError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2">{checkoutError}</p>
                )}

                <button
                  onClick={submitPayment}
                  disabled={isCheckingOut}
                  className="w-full bg-[#1C1C1C] text-white py-4 text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-[#C5A059] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isCheckingOut ? <Loader2 size={16} className="animate-spin" /> : <>Payer {estTotal.toFixed(2)} $</>}
                </button>
                <p className="text-[9px] text-center text-stone-400 flex items-center justify-center gap-1"><Lock size={10} /> Paiement sécurisé par Square</p>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* PANIER SLIDE-OVER */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[150]">
            <motion.div
              className="absolute inset-0 bg-black/10 backdrop-blur-sm"
              onClick={() => setIsCartOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
            <motion.div
              className="absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            >
              <div className="p-8 border-b flex justify-between items-center">
                <h3 className="font-serif text-2xl uppercase tracking-widest italic">{t.yourCart}</h3>
                <button onClick={() => setIsCartOpen(false)}><X size={24} strokeWidth={1} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-stone-400 gap-4 opacity-50">
                    <ShoppingBag size={48} strokeWidth={1} />
                    <p className="uppercase tracking-[0.3em] text-[10px]">{t.cartEmpty}</p>
                  </div>
                ) : cart.map(item => (
                  <motion.div
                    key={item.cartItemId}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                    className="flex gap-6 border-b border-stone-100 pb-6 group"
                  >
                    <div className="w-24 h-32 bg-stone-50 overflow-hidden rounded-sm border">
                      <img src={item.images?.[0]} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-serif text-lg leading-tight">{item.name}</h4>
                        {item.selectedColor && (
                          <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-1">{item.selectedColor}</p>
                        )}
                        <p className="text-sm font-light text-[#C5A059] mt-2">{item.price} $</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center border border-stone-200">
                          <button onClick={() => updateQty(item.cartItemId, -1)} className="p-2 px-3 text-stone-400 hover:text-black transition-colors"><Minus size={12}/></button>
                          <span className="w-8 text-center text-xs font-light">{item.quantity}</span>
                          <button onClick={() => updateQty(item.cartItemId, 1)} className="p-2 px-3 text-stone-400 hover:text-black transition-colors"><Plus size={12}/></button>
                        </div>
                        <button onClick={() => removeItem(item.cartItemId)} className="text-stone-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {cart.length > 0 && (
                <div className="p-8 bg-stone-50 border-t space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="uppercase tracking-widest text-[10px] text-stone-400">{t.total}</span>
                    <span className="font-serif text-3xl">{cart.reduce((a, b) => a + (b.price * b.quantity), 0)} $</span>
                  </div>
                  <motion.button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 350 }}
                    className="w-full bg-[#1C1C1C] text-white py-5 text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-[#C5A059] transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                    {isCheckingOut ? <Loader2 size={16} className="animate-spin" /> : (cart.some(i => i.isPreOrder) ? t.preOrder : t.proceedPayment)}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NAVBAR */}
      <nav className={`fixed w-full z-[100] transition-all duration-700 px-6 md:px-20 py-7 flex justify-between items-center ${scrolled ? 'bg-white/97 backdrop-blur-md shadow-sm' : 'bg-transparent text-white'}`}>
        <h1 className="text-lg md:text-xl font-serif uppercase tracking-[0.5em] font-light cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          Amélia Ruby
        </h1>
        <div className="hidden md:flex items-center gap-12">
          <button onClick={() => scrollToSection('store')} className="text-[9px] uppercase tracking-[0.3em] font-light hover:text-[#C5A059] transition-colors opacity-70 hover:opacity-100">{t.navCollection}</button>
          <button onClick={() => scrollToSection('bespoke-ai')} className="text-[9px] uppercase tracking-[0.3em] font-light hover:text-[#C5A059] transition-colors opacity-70 hover:opacity-100">{t.navBespoke}</button>
          <button onClick={() => scrollToSection('contact')} className="text-[9px] uppercase tracking-[0.3em] font-light hover:text-[#C5A059] transition-colors opacity-70 hover:opacity-100">{t.navContact}</button>
        </div>
        <div className="flex items-center gap-6 md:gap-8">
          {/* PASTILLE LANGUE FR / EN */}
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] font-light select-none">
            <button
              onClick={() => setLang('fr')}
              aria-pressed={lang === 'fr'}
              className={`transition-colors ${lang === 'fr' ? 'text-[#C5A059]' : 'opacity-50 hover:opacity-100'}`}
            >FR</button>
            <span className="opacity-30">/</span>
            <button
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              className={`transition-colors ${lang === 'en' ? 'text-[#C5A059]' : 'opacity-50 hover:opacity-100'}`}
            >EN</button>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="relative group flex items-center gap-3">
             <span className="hidden md:block text-[9px] uppercase tracking-[0.3em] font-light opacity-70 group-hover:opacity-100 group-hover:text-[#C5A059] transition-all">{t.navCart}</span>
             <div className="relative">
               <ShoppingBag size={20} strokeWidth={1} className="group-hover:text-[#C5A059] transition-colors" />
               {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-[#C5A059] text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
             </div>
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative h-screen flex overflow-hidden bg-[#0a0a0a]">

        {/* PANNEAU IMAGE — slideshow Ken Burns */}
        <div
          className="absolute inset-0 lg:inset-auto lg:right-0 lg:top-0 lg:h-full lg:w-[52%]"
          style={{ animation: 'revealRight 1.6s cubic-bezier(0.77,0,0.175,1) 0.3s forwards', clipPath: 'inset(0 100% 0 0)' }}
        >
          {/* Fondu gauche desktop */}
          <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#0a0a0a] to-transparent z-20 hidden lg:block" />
          {/* Overlay mobile */}
          <div className="absolute inset-0 bg-black/60 lg:bg-black/20 z-10" />

          {/* Images empilées — crossfade */}
          {heroImages.map((src, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-[1800ms] ease-in-out"
              style={{ opacity: i === heroIndex ? 1 : 0 }}
            >
              <img
                src={src}
                className="w-full h-full object-cover object-[35%_top] md:object-top hero-kb"
                style={{ ['--kb-anim' as any]: `kb${(i % 3) + 1} ${7 + i * 2}s ease-in-out infinite alternate` }}
                alt=""
              />
            </div>
          ))}

          {/* Indicateurs — lignes verticales dorées */}
          <div className="absolute bottom-10 right-6 z-30 hidden lg:flex flex-col gap-2.5 items-center">
            {heroImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIndex(i)}
                className="w-[1px] transition-all duration-700 ease-in-out"
                style={{
                  height: i === heroIndex ? 32 : 10,
                  background: i === heroIndex ? '#C5A059' : 'rgba(255,255,255,0.2)'
                }}
              />
            ))}
          </div>
        </div>

        {/* CONTENU — centré mobile, aligné gauche desktop */}
        <div className="relative z-20 flex flex-col justify-center items-center lg:items-start text-center lg:text-left px-8 md:px-16 lg:px-24 w-full lg:w-[56%]">

          {/* Label doré */}
          <div style={{ opacity: 0, animation: 'fadeUp 1s ease 0.5s forwards' }}>
            <div className="flex items-center justify-center lg:justify-start gap-4 mb-10">
              <div className="w-6 h-[1px] bg-[#C5A059]" />
              <p className="text-[8px] uppercase tracking-[0.6em] text-[#C5A059]/70 font-light whitespace-nowrap">{t.heroLabel}</p>
            </div>
          </div>

          {/* Titre ligne 1 — slide depuis le bas */}
          <div style={{ overflow: 'hidden' }}>
            <h2
              className="font-serif font-light text-white leading-[0.88]"
              style={{ fontSize: 'clamp(3.2rem,8.5vw,7.5rem)', opacity: 0, animation: 'slideUp 1.2s cubic-bezier(0.16,1,0.3,1) 0.65s forwards' }}
            >
              {t.heroTitle1}
            </h2>
          </div>

          {/* Titre ligne 2 — légèrement décalé */}
          <div style={{ overflow: 'hidden' }}>
            <h2
              className="font-serif font-light italic text-[#C5A059] leading-[0.88]"
              style={{ fontSize: 'clamp(3.2rem,8.5vw,7.5rem)', opacity: 0, animation: 'slideUp 1.2s cubic-bezier(0.16,1,0.3,1) 0.88s forwards' }}
            >
              {t.heroTitle2}
            </h2>
          </div>

          {/* Ligne séparatrice animée */}
          <div
            className="mt-10 mb-8 h-[1px] w-48 bg-gradient-to-r from-[#C5A059]/60 to-transparent origin-left"
            style={{ transform: 'scaleX(0)', animation: 'drawLine 1s ease 1.3s forwards' }}
          />

          {/* Sous-titre */}
          <p
            className="text-stone-400 font-light text-sm leading-[1.9] max-w-xs"
            style={{ opacity: 0, animation: 'fadeUp 1s ease 1.5s forwards' }}
          >
            {t.heroSubtitle}
          </p>

          {/* Bouton CTA */}
          <div style={{ opacity: 0, animation: 'fadeUp 1s ease 1.8s forwards' }} className="mt-10">
            <button
              onClick={() => scrollToSection('store')}
              className="group relative overflow-hidden border border-white/20 px-12 py-5 text-[10px] uppercase tracking-[0.4em] text-white font-light hover:border-[#C5A059] flex items-center gap-5 transition-colors duration-500"
            >
              <span className="relative z-10">{t.heroCta}</span>
              <span className="block h-[1px] w-5 bg-white/30 group-hover:w-10 group-hover:bg-[#C5A059] transition-all duration-500" />
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </button>
          </div>

          {/* Compteur de pièces */}
          <p
            className="text-[8px] uppercase tracking-[0.5em] text-white/18 mt-14"
            style={{ opacity: 0, animation: 'fadeUp 1s ease 2.1s forwards' }}
          >
            {products.length > 0 ? t.heroPieces(products.length) : t.heroCollection}
          </p>
        </div>

        {/* INDICATEUR DE DÉFILEMENT */}
        <div
          className="absolute bottom-10 left-8 md:left-16 lg:left-24 z-20 flex items-center gap-4"
          style={{ opacity: 0, animation: 'fadeUp 1s ease 2.4s forwards' }}
        >
          <div className="w-[1px] h-12 bg-white/20 relative overflow-hidden">
            <div className="absolute inset-x-0 h-6 bg-white/40" style={{ animation: 'scroll-line 2s ease-in-out infinite' }} />
          </div>
          <span className="text-[7px] uppercase tracking-[0.7em] text-white/25">{t.heroScroll}</span>
        </div>


      </section>

      {/* BANDEAU MARQUEE */}
      <div className="py-5 bg-[#111111] overflow-hidden border-y border-stone-800/50">
        <div style={{ animation: 'marquee 40s linear infinite', display: 'flex', width: 'max-content' }}>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center">
              {t.marquee.map((text, j) => (
                <span key={j} className="flex items-center gap-8 px-8 text-[8px] uppercase tracking-[0.5em] text-white/25 whitespace-nowrap">
                  {text} <span className="w-1 h-1 rounded-full bg-[#C5A059] inline-block flex-shrink-0" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* GRILLE DE PRODUITS */}
      <section id="store" className="py-20 md:py-32 px-3 md:px-20 max-w-7xl mx-auto border-b border-stone-200/50">
        <div className="mb-16 md:mb-32 text-center space-y-4">
          <Reveal><h3 className="text-3xl md:text-5xl font-serif font-light leading-tight">{t.productsTitle1} <span className="italic text-[#C5A059]">{t.productsTitle2}</span></h3></Reveal>
          <Reveal delay={200}><div className="w-12 h-px bg-[#C5A059] mx-auto opacity-50"></div></Reveal>
        </div>

        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center"><Loader2 className="animate-spin text-[#C5A059]" size={32} /></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-x-3 md:gap-x-16 gap-y-12 md:gap-y-28">
            {[...products]
              .filter(p => p.isPublished === true)
              .sort((a, b) => {
                const aOut = a.stockQuantity !== undefined && a.stockQuantity <= 0 ? 1 : 0;
                const bOut = b.stockQuantity !== undefined && b.stockQuantity <= 0 ? 1 : 0;
                if (aOut !== bOut) return aOut - bOut;
                return (Number(b.price) || 0) - (Number(a.price) || 0);
              })
              .map((p, i) => {
              const isSoldOut = p.stockQuantity !== undefined && p.stockQuantity <= 0;
              return (
              <Reveal key={p.id} delay={i * 100}>
                <TiltCard>
                <div className="group" onClick={() => openProductModal(p)}>
                  <div className="relative aspect-[4/5] overflow-hidden bg-stone-50 mb-3 md:mb-8 shadow-sm rounded-sm">
                    {/* Image avec effet grayscale si épuisé */}
                    <img src={p.images?.[0]} className={`w-full h-full object-contain md:object-cover transition-transform duration-[3s] ${isSoldOut ? 'grayscale-[60%] scale-100' : 'group-hover:scale-110'}`} alt={p.name} />

                    {/* Effet SOLD OUT / FOMO Badge */}
                    {isSoldOut ? (
                      <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all">
                         <span className="bg-white/95 px-4 md:px-8 py-2 md:py-3 text-[8px] md:text-[10px] uppercase tracking-[0.3em] md:tracking-[0.4em] font-medium text-stone-900 shadow-xl border border-stone-100/50">
                            {t.soldOut}
                         </span>
                      </div>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-end p-8">
                          <button className="w-full bg-white text-black py-4 text-[10px] uppercase tracking-widest font-medium transition-all hover:bg-[#C5A059] hover:text-white shadow-xl translate-y-4 group-hover:translate-y-0 duration-500">
                            {t.viewDetails}
                          </button>
                        </div>
                        {/* BADGE FOMO */}
                        {p.showFomo && p.stockQuantity > 0 && (
                          <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-[#C5A059] text-white px-2 py-1 md:px-3 md:py-1.5 text-[7px] md:text-[8px] uppercase tracking-widest shadow-md flex items-center gap-1 md:gap-1.5">
                             <Clock size={9} className="md:hidden" />
                             <Clock size={10} className="hidden md:block" />
                             <span className="hidden md:inline">{t.onlyLeft}</span>{p.stockQuantity}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-1 px-1 md:px-2">
                    <div className="space-y-0.5 md:space-y-1 min-w-0">
                      <p className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-[#C5A059] font-medium">{p.category || t.defaultCategory}</p>
                      <h4 className="font-serif text-sm md:text-xl tracking-wide text-stone-900 truncate">{p.name}</h4>
                    </div>
                    <span className="text-xs md:text-md font-light text-stone-500">{p.price} $</span>
                  </div>
                </div>
                </TiltCard>
              </Reveal>
            )})}
          </div>
        )}
      </section>

      {/* SECTION HISTOIRE DE LA MARQUE */}
      <section className="bg-[#0F0F0F] py-24 md:py-32 overflow-hidden border-t border-stone-900 relative">
        <div className="max-w-7xl mx-auto px-6 md:px-20 mb-16 md:mb-20">
          <Reveal>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-6 h-[1px] bg-[#C5A059]" />
              <p className="text-[9px] uppercase tracking-[0.5em] text-[#C5A059]">{t.universeLabel}</p>
            </div>
            <h3 className="text-4xl md:text-6xl font-serif font-light text-white leading-[1.1] max-w-3xl">
              {t.universeTitlePre}<em className="not-italic text-shimmer">{t.universeTitleEm}</em>
            </h3>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-stone-400 leading-[1.9] font-light text-sm md:text-base max-w-xl mt-8">
              {t.universeText}
            </p>
          </Reveal>
        </div>

        {/* Carousel marquee — collage de portraits */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 w-20 md:w-40 z-10 bg-gradient-to-r from-[#0F0F0F] to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-20 md:w-40 z-10 bg-gradient-to-l from-[#0F0F0F] to-transparent pointer-events-none" />

          {/* On répète la base plusieurs fois pour que chaque moitié dépasse la largeur
              des très grands écrans : le translate de -50% reste ainsi toujours transparent (boucle infinie). */}
          <div className="flex hover:[animation-play-state:paused]" style={{ animation: 'marquee 320s linear infinite', width: 'max-content' }}>
            {[...Array(8)].flatMap(() => inspirations).map((p, i) => (
              <div
                key={i}
                className={`flex-shrink-0 px-2 md:px-4 ${i % 3 === 0 ? 'pt-0' : i % 3 === 1 ? 'pt-10 md:pt-16' : 'pt-5 md:pt-8'}`}
              >
                <button
                  onClick={() => setSelectedInspiration(p)}
                  className="block w-[200px] md:w-[280px] aspect-[3/4] overflow-hidden bg-stone-800 group relative cursor-pointer text-left"
                  aria-label={`${t.readHerStory} — ${p.name}`}
                >
                  <img
                    src={p.src}
                    className="w-full h-full object-cover transition-all duration-[2s] grayscale-[20%] group-hover:grayscale-0 group-hover:scale-110"
                    alt={p.name}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.15'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="w-5 h-[1px] bg-[#C5A059] transition-all duration-500 group-hover:w-10" />
                    <p className="font-serif text-white text-xl md:text-2xl italic leading-tight">{p.name}</p>
                    <p className="text-[8px] uppercase tracking-[0.3em] text-white/50">{lang === 'en' ? p.bagEn : p.bag}</p>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 border border-[#C5A059]/40 bg-[#0F0F0F]/60 backdrop-blur-sm px-3 py-1.5">
                    <p className="text-[8px] uppercase tracking-[0.3em] text-[#C5A059]">{t.readHerStory}</p>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Citation finale */}
        <div className="max-w-3xl mx-auto px-6 md:px-20 mt-20 md:mt-28 text-center">
          <Reveal>
            <div className="w-px h-12 bg-[#C5A059]/30 mx-auto mb-8" />
            <p className="font-serif italic text-white/80 text-lg md:text-xl leading-relaxed">
              {t.brandQuote}
            </p>
            <p className="text-[8px] uppercase tracking-[0.5em] text-[#C5A059]/60 mt-6">— Amélia Ruby</p>
          </Reveal>
        </div>
      </section>

      {/* SECTION POINTS DE VENTE */}
      <section id="retailers" className="py-24 md:py-32 px-6 md:px-20 bg-[#FDFCFB] border-t border-stone-200/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16 md:mb-20">
            <Reveal>
              <div className="flex items-center justify-center gap-4">
                <div className="w-6 h-[1px] bg-[#C5A059]" />
                <p className="text-[9px] uppercase tracking-[0.5em] text-[#C5A059]">{t.retailersLabel}</p>
                <div className="w-6 h-[1px] bg-[#C5A059]" />
              </div>
            </Reveal>
            <Reveal delay={100}>
              <h3 className="text-3xl md:text-5xl font-serif font-light leading-tight">
                {t.retailersTitlePre}<span className="italic text-[#C5A059]">{t.retailersTitleEm}</span>
              </h3>
            </Reveal>
            <Reveal delay={200}>
              <p className="text-stone-400 font-light text-sm max-w-lg mx-auto leading-[1.9]">{t.retailersText}</p>
            </Reveal>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {(retailers.length > 0 ? retailers : defaultRetailers).map((shop, i) => (
              <Reveal key={shop.id || shop.name} delay={i * 100}>
                <a
                  href={shop.url || undefined}
                  target={shop.url ? '_blank' : undefined}
                  rel={shop.url ? 'noopener noreferrer' : undefined}
                  aria-label={`${shop.name} — ${t.retailersVisit}`}
                  className="group flex flex-col items-center text-center bg-white border border-stone-100 rounded-sm p-6 md:p-8 shadow-sm hover:shadow-xl hover:border-[#C5A059]/40 transition-all duration-500 h-full"
                >
                  <div className="w-full aspect-square flex items-center justify-center overflow-hidden mb-5 bg-white rounded-sm">
                    {shop.logo ? (
                      <img
                        src={shop.logo}
                        alt={shop.name}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-700"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }}
                      />
                    ) : (
                      <ShoppingBag size={40} strokeWidth={1} className="text-stone-200" />
                    )}
                  </div>
                  <h4 className="font-serif text-base md:text-lg text-stone-900 leading-tight">{shop.name}</h4>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[8px] uppercase tracking-[0.3em] text-stone-400 group-hover:text-[#C5A059] transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                    {t.retailersVisit}
                  </span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION IA - ATELIER SUR MESURE */}
      <section id="bespoke-ai" className="py-24 bg-[#141414] text-white border-t border-stone-800">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          
          <div className="mb-16 flex flex-col md:flex-row items-start md:items-end justify-between gap-8 text-center md:text-left">
            <Reveal>
              <div className="flex items-center justify-center md:justify-start gap-3 text-[#C5A059] mb-4">
                <Sparkles size={16} strokeWidth={1.5} />
                <span className="text-[9px] uppercase tracking-[0.5em] font-medium">{t.conciergeLabel}</span>
              </div>
              <h3 className="text-4xl md:text-6xl font-serif font-light leading-tight">
                {t.atelierTitlePre}<span className="italic text-[#C5A059] font-serif">{t.atelierTitleEm}</span>
              </h3>
              <p className="mt-6 text-stone-400 font-light max-w-xl text-sm leading-relaxed tracking-wide">
                {t.atelierText}
              </p>
            </Reveal>
            <Reveal delay={200}>
               <button 
                  onClick={resetChat} 
                  className="flex items-center gap-2 text-[9px] uppercase tracking-[0.3em] font-light text-stone-400 hover:text-white transition-colors border border-stone-800 px-6 py-3 rounded-full hover:bg-white/5"
                >
                  <RefreshCw size={12} /> {t.restartCreation}
               </button>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 h-auto lg:h-[700px]">
            
            {/* COLONNE GAUCHE : DIALOGUE (CONCIERGERIE) */}
            <div className="lg:col-span-5 flex flex-col border border-white/10 bg-white/5 backdrop-blur-md rounded-sm overflow-hidden h-[600px] lg:h-full relative">
              <div className="p-8 border-b border-white/10 flex items-center gap-4 bg-black/20">
                <div className="w-10 h-10 rounded-full border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059]">
                  <span className="font-serif italic text-lg">P</span>
                </div>
                <div>
                  <h4 className="font-serif text-lg tracking-wide">{t.aiArtisan}</h4>
                  <p className="text-[8px] uppercase tracking-[0.3em] text-[#C5A059] mt-1">Maison Amélia Ruby</p>
                </div>
              </div>
              
              <div ref={chatScrollRef} className="flex-1 p-8 overflow-y-auto space-y-8 scroll-smooth">
                {chatMessages.map((msg, idx) => {
                  if (msg.type === 'image') return null; 
                  
                  return (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] ${
                        msg.role === 'user' 
                          ? 'text-right' 
                          : 'text-left'
                      }`}>
                        {msg.role === 'bot' && idx !== 0 && (
                          <span className="text-[8px] uppercase tracking-widest text-[#C5A059] mb-2 block">{t.theArtisan}</span>
                        )}
                        <p className={`text-sm leading-relaxed font-light ${
                          msg.role === 'user' ? 'text-white italic' : 'text-stone-300'
                        }`}>
                          {msg.role === 'user' ? `« ${msg.content} »` : msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {isGeneratingImage && (
                  <div className="flex justify-start">
                    <div className="text-[#C5A059] flex items-center gap-3">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-[9px] uppercase tracking-widest font-medium">{t.sketchInProgress}</span>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleChatSubmit} className="p-6 bg-black/40 border-t border-white/5">
                <div className="relative flex items-end gap-4">
                  <textarea 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit();
                      }
                    }}
                    placeholder={t.chatPlaceholder}
                    disabled={isGeneratingImage}
                    rows={2}
                    className="w-full bg-transparent border-b border-stone-600 focus:border-[#C5A059] py-2 text-sm font-light outline-none transition-colors disabled:opacity-50 resize-none text-white placeholder:text-stone-600"
                  />
                  <button 
                    type="submit" 
                    disabled={!chatInput.trim() || isGeneratingImage}
                    className="pb-2 text-[#C5A059] hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-[#C5A059]"
                  >
                    <Send size={20} strokeWidth={1.5} />
                  </button>
                </div>
              </form>
            </div>

            {/* COLONNE DROITE : LA TOILE / L'ESQUISSE (GRAND FORMAT) */}
            <div className="lg:col-span-7 bg-black flex flex-col justify-center items-center relative overflow-hidden border border-white/5 min-h-[400px]">
              {latestImage ? (
                <div className="w-full h-full p-8 md:p-16 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-1000">
                  <div className="relative max-w-full max-h-full flex items-center justify-center">
                    <div className="absolute -inset-4 border border-[#C5A059]/20"></div>
                    <img 
                      src={latestImage} 
                      alt={lang === 'en' ? 'AI-generated bespoke sketch' : 'Esquisse sur mesure générée par IA'} 
                      className="w-auto h-auto max-w-full max-h-[500px] object-contain shadow-2xl shadow-black"
                    />
                  </div>
                  <div className="mt-12 flex flex-col sm:flex-row items-center gap-6 opacity-90 hover:opacity-100 transition-opacity">
                    <button onClick={handleDownloadImage} className="text-[9px] uppercase tracking-[0.3em] font-light border border-white/20 hover:border-[#C5A059] px-6 py-3 rounded-full transition-all flex items-center gap-2 text-stone-300 hover:text-white">
                      <Download size={12} /> {t.download}
                    </button>
                    <button onClick={() => window.location.href = "mailto:info@ameliaruby.com"} className="text-[9px] uppercase tracking-[0.3em] font-medium bg-[#C5A059] text-black hover:bg-white px-8 py-3 rounded-full transition-all flex items-center gap-2">
                      <Mail size={12} /> {t.requestQuote}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 space-y-6 opacity-40">
                  <div className="w-24 h-32 border border-stone-700 mx-auto flex items-center justify-center mb-6 relative">
                     <div className="w-16 h-20 border border-stone-800 absolute"></div>
                     <Sparkles size={24} className="text-stone-600" strokeWidth={1} />
                  </div>
                  <h4 className="font-serif text-2xl">{t.canvasBlank}</h4>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 max-w-xs mx-auto">
                    {t.canvasBlankText}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* MODALE PRODUIT */}
      <AnimatePresence>
      {selectedProduct && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedProduct(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="relative w-full max-w-7xl bg-white flex flex-col md:flex-row overflow-y-auto md:overflow-hidden rounded-sm max-h-[95vh]">
            <button className="fixed md:absolute top-6 right-6 z-[60] p-2 bg-white/90 backdrop-blur-md rounded-full shadow-md" onClick={() => setSelectedProduct(null)}><X size={20} /></button>

            <div
              className="w-full md:w-3/5 bg-stone-50 sticky top-0 md:static md:h-auto md:overflow-hidden select-none flex items-center justify-center h-[78vh] md:h-auto md:p-6"
              onTouchStart={(e) => { touchStartXRef.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (touchStartXRef.current === null || displayImages.length <= 1) return;
                const diff = touchStartXRef.current - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 50) {
                  if (diff > 0) setCurrentImageIndex(prev => (prev === displayImages.length - 1 ? 0 : prev + 1));
                  else setCurrentImageIndex(prev => (prev === 0 ? displayImages.length - 1 : prev - 1));
                }
                touchStartXRef.current = null;
              }}
            >
              {/* Wrapper qui se cale exactement sur la taille rendue de l'image */}
              <div className="relative inline-block max-w-full max-h-full md:h-full group/gal">
                <img
                  src={displayImages[Math.min(currentImageIndex, displayImages.length - 1)] || displayImages[0]}
                  className={`block max-w-full max-h-full w-auto h-auto object-contain md:h-full md:w-auto md:max-w-full md:max-h-full transition-all duration-700 ${selectedProduct.stockQuantity !== undefined && selectedProduct.stockQuantity <= 0 ? 'grayscale-[40%]' : ''}`}
                  alt=""
                  draggable={false}
                />
                {displayImages.length > 1 && (
                  <>
                    {/* Chevrons desktop (gros) */}
                    <button
                      onClick={() => setCurrentImageIndex(prev => (prev === 0 ? displayImages.length - 1 : prev - 1))}
                      className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-white backdrop-blur-md rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50 items-center justify-center"
                      aria-label="Image précédente"
                    >
                      <ChevronLeft size={20}/>
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(prev => (prev === displayImages.length - 1 ? 0 : prev + 1))}
                      className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-white backdrop-blur-md rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50 items-center justify-center"
                      aria-label="Image suivante"
                    >
                      <ChevronRight size={20}/>
                    </button>

                    {/* Petites flèches mobile */}
                    <button
                      onClick={() => setCurrentImageIndex(prev => (prev === 0 ? displayImages.length - 1 : prev - 1))}
                      className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/85 backdrop-blur-sm rounded-full shadow-md z-40 flex items-center justify-center active:scale-95 transition-transform"
                      aria-label="Image précédente"
                    >
                      <ChevronLeft size={14}/>
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(prev => (prev === displayImages.length - 1 ? 0 : prev + 1))}
                      className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/85 backdrop-blur-sm rounded-full shadow-md z-40 flex items-center justify-center active:scale-95 transition-transform"
                      aria-label="Image suivante"
                    >
                      <ChevronRight size={14}/>
                    </button>

                    {/* Compteur image (mobile uniquement) */}
                    <div className="md:hidden absolute top-3 left-3 bg-black/60 text-white text-[9px] uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-sm">
                      {Math.min(currentImageIndex, displayImages.length - 1) + 1} / {displayImages.length}
                    </div>

                    {/* Dots indicateurs (mobile uniquement) */}
                    <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-full">
                      {displayImages.map((_: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImageIndex(i)}
                          className={`h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'w-6 bg-[#C5A059]' : 'w-1.5 bg-white/60'}`}
                          aria-label={`Image ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="w-full md:w-2/5 px-8 pt-8 pb-10 md:p-16 flex flex-col justify-between bg-[#FDFCFB] md:overflow-y-auto relative z-10 -mt-8 md:mt-0 rounded-t-3xl md:rounded-none shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.15)] md:shadow-none">
              {/* Indicateur swipe (mobile uniquement) */}
              <div className="md:hidden w-12 h-1 bg-stone-300 rounded-full mx-auto -mt-3 mb-6" />
              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="uppercase tracking-[0.4em] text-[10px] text-[#C5A059] font-semibold">{selectedProduct.category}</p>
                  <h2 className="text-4xl md:text-5xl font-serif leading-tight">{selectedProduct.name}</h2>
                  <p className="text-2xl font-light text-stone-600">{selectedProduct.price} $</p>
                  
                  {/* MESSAGE STOCK / FOMO / EPUISE */}
                  {selectedProduct.stockQuantity !== undefined && selectedProduct.stockQuantity <= 0 ? (
                    <p className="text-[10px] uppercase tracking-widest text-red-800 font-medium flex items-center gap-2 pt-2">
                       <X size={14}/> {t.permanentlySoldOut}
                    </p>
                  ) : (
                    selectedProduct.showFomo && selectedProduct.stockQuantity > 0 && (
                      <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-medium flex items-center gap-2 pt-2">
                        <Clock size={14}/> {t.limitedEditionPre}{selectedProduct.stockQuantity}{t.limitedEditionPost}
                      </p>
                    )
                  )}
                </div>

                {/* VARIANTES DE COULEUR — nouveau format (image + stock par couleur) */}
                {Array.isArray(selectedProduct.colorVariants) && selectedProduct.colorVariants.length > 0 ? (
                  <div className="space-y-3 border-t border-stone-100 pt-6">
                    {(() => {
                      const active = selectedProduct.colorVariants.find((v: any) => v.name === selectedColor);
                      const isVariantOut = active ? active.stockQuantity <= 0 : false;
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">{t.colorLabel} <span className="text-stone-900">{selectedColor || '—'}</span></p>
                            {active && (
                              <span className={`text-[9px] uppercase tracking-widest ${isVariantOut ? 'text-red-700' : 'text-[#C5A059]'}`}>
                                {isVariantOut ? t.soldOut : `${active.stockQuantity} ${t.inStock}`}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedProduct.colorVariants.map((variant: any, idx: number) => {
                              const variantOut = variant.stockQuantity <= 0;
                              const isActive = selectedColor === variant.name;
                              const variantImgs = getVariantImages(variant);
                              const thumb = variantImgs[0];
                              return (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setSelectedColor(variant.name);
                                    // Les images de la variante sont prépendues dans displayImages -> on saute à l'index 0
                                    if (variantImgs.length > 0) setCurrentImageIndex(0);
                                  }}
                                  disabled={variantOut}
                                  className={`flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-widest border transition-all ${
                                    isActive
                                      ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]'
                                      : variantOut
                                        ? 'border-stone-100 text-stone-300 cursor-not-allowed opacity-60'
                                        : 'border-stone-200 text-stone-500 hover:border-[#C5A059] hover:text-[#C5A059]'
                                  }`}
                                >
                                  {thumb && (
                                    <span className="w-6 h-6 bg-stone-100 overflow-hidden inline-block flex-shrink-0">
                                      <img src={thumb} className={`w-full h-full object-cover ${variantOut ? 'grayscale' : ''}`} alt={variant.name} />
                                    </span>
                                  )}
                                  <span>{variant.name}{variantOut && t.soldOutSuffix}</span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : selectedProduct.colors ? (
                  // LEGACY : ancien format string sans variantes
                  <div className="space-y-3 border-t border-stone-100 pt-6">
                    <p className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">{t.colorLabel} <span className="text-stone-900">{selectedColor}</span></p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.colors.split(',').map((c: string) => c.trim()).filter(Boolean).map((color: string, idx: number) => (
                        <button key={idx} onClick={() => setSelectedColor(color)} className={`px-4 py-2 text-[10px] uppercase tracking-widest border transition-all ${selectedColor === color ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]' : 'border-stone-200 text-stone-400'}`}>
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="whitespace-pre-wrap italic text-stone-500 font-light leading-relaxed pt-2">{selectedProduct.description}</p>
              </div>

              <div className="pt-16">
                {selectedProduct.stockQuantity !== undefined && selectedProduct.stockQuantity <= 0 ? (
                  <button disabled className="w-full bg-stone-100 text-stone-400 border border-stone-200 py-6 text-[10px] uppercase tracking-[0.3em] font-medium cursor-not-allowed shadow-sm flex items-center justify-center gap-3">
                    <Lock size={14} /> {t.victimSuccess}
                  </button>
                ) : (
                  <button onClick={() => addToCart(selectedProduct)} className="w-full bg-[#1C1C1C] text-white py-6 text-[10px] uppercase tracking-[0.3em] font-medium hover:bg-[#C5A059] transition-all shadow-xl group flex items-center justify-center gap-4">
                    {selectedProduct.isPreOrder ? t.preOrder : t.addToCart} <ShoppingBag size={14} />
                  </button>
                )}
              </div>
            </div>

          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* SECTION CONTACT */}
      <section id="contact" className="py-40 px-6 md:px-20 bg-[#FDFCFB] relative overflow-hidden">
        <div className="max-w-2xl mx-auto text-center space-y-12">
          <Reveal>
            <div className="space-y-8">
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-[1px] bg-stone-200" />
                <p className="text-[9px] uppercase tracking-[0.5em] text-stone-400">{t.ctaLabel}</p>
                <div className="w-12 h-[1px] bg-stone-200" />
              </div>
              <h3 className="text-4xl md:text-6xl font-serif font-light leading-tight">
                {t.ctaTitlePre}<br /><em className="not-italic text-shimmer">{t.ctaTitleEm}</em>
              </h3>
              <p className="text-stone-400 font-light text-sm max-w-lg mx-auto leading-[2]">
                {t.ctaText}
              </p>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <form onSubmit={handleContactSubmit} className="text-left space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label htmlFor="contact-name" className="text-[9px] uppercase tracking-[0.3em] text-stone-500 font-medium">{t.contactName}</label>
                  <input
                    id="contact-name"
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t.contactNamePh}
                    required
                    className="w-full bg-transparent border-b border-stone-300 focus:border-[#C5A059] py-3 text-sm font-light outline-none transition-colors placeholder:text-stone-300"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="contact-email" className="text-[9px] uppercase tracking-[0.3em] text-stone-500 font-medium">{t.contactEmail}</label>
                  <input
                    id="contact-email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={t.contactEmailPh}
                    required
                    className="w-full bg-transparent border-b border-stone-300 focus:border-[#C5A059] py-3 text-sm font-light outline-none transition-colors placeholder:text-stone-300"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="contact-message" className="text-[9px] uppercase tracking-[0.3em] text-stone-500 font-medium">{t.contactMessage}</label>
                <textarea
                  id="contact-message"
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={t.contactMessagePh}
                  required
                  rows={4}
                  className="w-full bg-transparent border-b border-stone-300 focus:border-[#C5A059] py-3 text-sm font-light outline-none transition-colors resize-none placeholder:text-stone-300"
                />
              </div>

              <div className="flex items-center gap-3 text-stone-400">
                <Clock size={13} className="text-[#C5A059]" />
                <span className="text-[9px] uppercase tracking-[0.3em] font-light">{t.contactDelay}</span>
              </div>

              {contactFeedback && (
                <p className={`text-[11px] tracking-wide font-light ${contactStatus === 'success' ? 'text-[#C5A059]' : 'text-red-600'}`}>
                  {contactFeedback}
                </p>
              )}

              <div className="pt-2 flex justify-center">
                <button
                  type="submit"
                  disabled={contactStatus === 'sending'}
                  className="group relative overflow-hidden bg-[#1C1C1C] text-white px-14 py-5 text-[10px] uppercase tracking-[0.3em] font-medium transition-all duration-500 hover:shadow-2xl hover:shadow-[#C5A059]/20 disabled:opacity-60 flex items-center justify-center gap-3"
                >
                  <span className="relative z-10 flex items-center gap-3 group-hover:text-black transition-colors duration-500">
                    {contactStatus === 'sending'
                      ? <><Loader2 size={14} className="animate-spin" /> {t.contactSending}</>
                      : <><Mail size={14} /> {t.contactSend}</>}
                  </span>
                  <div className="absolute inset-0 bg-[#C5A059] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                </button>
              </div>
            </form>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#111111] text-white/30 pt-28 pb-12 px-6 md:px-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 pb-20 border-b border-white/5">
            <div className="space-y-6">
              <h5 className="text-white font-serif text-4xl tracking-widest leading-none">Amélia<br/>Ruby</h5>
              <p className="text-[10px] uppercase tracking-[0.4em] font-light leading-relaxed">{t.footerTagline}<br/>{t.footerCity}</p>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-4 h-[1px] bg-[#C5A059]" />
                <span className="text-[8px] uppercase tracking-[0.3em] text-[#C5A059]/60">{t.footerCertified}</span>
              </div>
              <div className="flex items-center gap-4 pt-3">
                <a
                  href="https://www.instagram.com/ameliarubyofficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 flex items-center justify-center border border-white/10 rounded-full text-white/40 hover:text-[#C5A059] hover:border-[#C5A059]/40 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=61583868189086"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 flex items-center justify-center border border-white/10 rounded-full text-white/40 hover:text-[#C5A059] hover:border-[#C5A059]/40 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="space-y-6">
              <p className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-medium">{t.footerNav}</p>
              <div className="space-y-4">
                <button onClick={() => window.scrollTo({top:0,behavior:'smooth'})} className="block text-[10px] uppercase tracking-[0.3em] hover:text-[#C5A059] transition-colors font-light">{t.navCollection}</button>
                <button onClick={() => scrollToSection('bespoke-ai')} className="block text-[10px] uppercase tracking-[0.3em] hover:text-[#C5A059] transition-colors font-light">{t.footerAiAtelier}</button>
                <a href="https://www.instagram.com/ameliarubyofficial/" target="_blank" rel="noopener noreferrer" className="block text-[10px] uppercase tracking-[0.3em] hover:text-[#C5A059] transition-colors font-light">Instagram</a>
              </div>
            </div>
            <div className="space-y-6">
              <p className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-medium">{t.footerContact}</p>
              <div className="space-y-4">
                <a href="mailto:info@ameliaruby.com" className="block text-[10px] uppercase tracking-[0.3em] hover:text-[#C5A059] transition-colors font-light">info@ameliaruby.com</a>
                <p className="text-[10px] uppercase tracking-[0.3em] font-light">{t.footerCity}</p>
                <button onClick={() => setView('admin')} className="text-[10px] uppercase tracking-[0.3em] hover:text-[#C5A059] transition-colors font-light">{t.footerPrivateAccess}</button>
              </div>
            </div>
          </div>
          <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-center">
            <p className="text-[8px] uppercase tracking-[0.3em] font-light text-stone-700">{t.footerRights}</p>
            <div className="flex items-center gap-3">
              <div className="w-4 h-[1px] bg-white/10" />
              <p className="text-[8px] uppercase tracking-[0.3em] font-light text-stone-700">{t.footerMade}</p>
              <div className="w-4 h-[1px] bg-white/10" />
            </div>
          </div>
          <div className="pt-6 text-center">
            <a href="https://lavoiedigital.ca" target="_blank" rel="noopener noreferrer" className="text-[8px] uppercase tracking-[0.3em] font-light text-stone-700 hover:text-[#C5A059] transition-colors">{t.footerCredit}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}