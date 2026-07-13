"use client";

import React, { useEffect } from 'react';
import { CheckCircle, ArrowLeft, ShoppingBag } from 'lucide-react';

export default function SuccessPage() {
  // Optionnel : tu pourrais récupérer le session_id dans l'URL pour afficher plus de détails
  // const searchParams = new URLSearchParams(window.location.search);
  // const sessionId = searchParams.get('session_id');

  // Petite animation d'apparition
  const [isVisible, setIsVisible] = React.useState(false);
  const [lang, setLang] = React.useState<'fr' | 'en'>('fr');
  useEffect(() => {
    setIsVisible(true);
    try {
      const stored = localStorage.getItem('ar-lang');
      if (stored === 'fr' || stored === 'en') setLang(stored);
    } catch {}
  }, []);

  const t = lang === 'en'
    ? {
        title: 'Order Confirmed',
        text: 'Thank you for your trust. Your transaction has been processed successfully. The atelier is preparing your piece with the greatest care. You will soon receive an email with the shipping details.',
        back: 'Back to the collection',
        rights: '© 2024 — Maison Amélia Ruby • Atelier Bordeaux',
        credit: 'Created by Lavoie Digital',
      }
    : {
        title: 'Commande Confirmée',
        text: "Merci pour votre confiance. Votre transaction a été traitée avec succès. L'atelier prépare votre pièce avec le plus grand soin. Vous recevrez très prochainement un email avec les détails de l'expédition.",
        back: 'Retour à la collection',
        rights: '© 2024 — Maison Amélia Ruby • Atelier Bordeaux',
        credit: 'Création de Lavoie Digital',
      };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1C1C1C] font-sans flex flex-col selection:bg-[#C5A059] selection:text-white">
      
      {/* NAVBAR SIMPLIFIÉE */}
      <nav className="w-full px-6 md:px-20 py-8 flex justify-center items-center absolute top-0 border-b border-stone-100">
        <h1 className="text-xl md:text-2xl font-serif uppercase tracking-[0.5em] font-light">
          Amélia Ruby
        </h1>
      </nav>

      {/* CONTENU CENTRAL */}
      <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        <div className="bg-white p-12 md:p-16 shadow-2xl border border-stone-50 max-w-2xl w-full flex flex-col items-center">
          <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mb-8">
            <CheckCircle size={40} className="text-[#C5A059]" strokeWidth={1} />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-serif leading-tight mb-4">
            {t.title}
          </h2>

          <div className="w-12 h-px bg-[#C5A059] mx-auto opacity-50 mb-6"></div>

          <p className="text-stone-500 font-light mb-12 max-w-md mx-auto leading-relaxed">
            {t.text}
          </p>

          <a
            href="/"
            className="bg-[#1C1C1C] text-white px-10 py-5 text-[10px] uppercase tracking-[0.3em] font-medium hover:bg-[#C5A059] transition-all shadow-lg flex items-center gap-3"
          >
            <ArrowLeft size={14} /> {t.back}
          </a>
        </div>
        
      </div>

      {/* FOOTER MINIMAL */}
      <footer className="py-8 text-center border-t border-stone-100 space-y-3">
        <p className="text-[9px] uppercase tracking-[0.3em] font-light text-stone-400">
          {t.rights}
        </p>
        <a href="https://lavoiedigital.ca" target="_blank" rel="noopener noreferrer" className="inline-block text-[9px] uppercase tracking-[0.3em] font-light text-stone-400 hover:text-stone-600 transition-colors">
          {t.credit}
        </a>
      </footer>

    </div>
  );
}