"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export type Lang = "fr" | "en";

export type LegalSection = {
  heading: string;
  /** Paragraphes de la section, rendus dans l'ordre. */
  paragraphs?: string[];
  /** Liste à puces affichée après les paragraphes. */
  bullets?: string[];
  /** Paragraphes de conclusion, rendus après la liste à puces. */
  afterBullets?: string[];
  /** Encadré doré mis en évidence à la fin de la section. */
  callout?: string;
};

export type LegalContent = {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string[];
  sections: LegalSection[];
  /** Invitation à écrire à la maison, affichée en bas de page. */
  contactTitle: string;
  contactText: string;
};

/**
 * Langue partagée avec la page d'accueil via la clé « ar-lang » du localStorage,
 * afin que le visiteur retrouve son choix en naviguant d'une page à l'autre.
 */
export function useStoredLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ar-lang");
      if (stored === "fr" || stored === "en") {
        setLangState(stored);
        document.documentElement.lang = stored === "en" ? "en" : "fr-CA";
      }
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("ar-lang", l);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = l === "en" ? "en" : "fr-CA";
    }
  };

  return [lang, setLang];
}

const CHROME = {
  fr: {
    back: "Retour à la collection",
    privacy: "Politique de confidentialité",
    returns: "Politique de retour et garantie",
    rights: "© 2026 — Maison Amélia Ruby — Tous droits réservés",
    credit: "Création de Lavoie Digital",
    updatedLabel: "Dernière mise à jour",
  },
  en: {
    back: "Back to the collection",
    privacy: "Privacy Policy",
    returns: "Return & Warranty Policy",
    rights: "© 2026 — Maison Amélia Ruby — All rights reserved",
    credit: "Created by Lavoie Digital",
    updatedLabel: "Last updated",
  },
} as const;

const EMAIL = "info@ameliaruby.com";

export default function LegalPage({
  content,
  current,
}: {
  content: Record<Lang, LegalContent>;
  /** Page affichée — l'autre politique est proposée en bas de page. */
  current: "privacy" | "returns";
}) {
  const [lang, setLang] = useStoredLang();
  const t = content[lang];
  const c = CHROME[lang];

  const other =
    current === "privacy"
      ? { href: "/politique-retour", label: c.returns }
      : { href: "/politique-confidentialite", label: c.privacy };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1C1C1C] font-sans flex flex-col selection:bg-[#C5A059] selection:text-white">
      {/* NAVBAR */}
      <nav className="w-full px-6 md:px-20 py-7 flex items-center justify-between border-b border-stone-100 bg-[#FDFCFB]/90 backdrop-blur-sm sticky top-0 z-40">
        <Link
          href="/"
          className="flex items-center gap-2 text-[9px] uppercase tracking-[0.3em] font-light text-stone-500 hover:text-[#C5A059] transition-colors"
        >
          <ArrowLeft size={13} strokeWidth={1.5} />
          <span className="hidden sm:inline">{c.back}</span>
        </Link>

        <Link
          href="/"
          className="font-serif uppercase tracking-[0.4em] text-sm md:text-lg font-light hover:text-[#C5A059] transition-colors"
        >
          Amélia Ruby
        </Link>

        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.3em] font-light">
          <button
            type="button"
            onClick={() => setLang("fr")}
            aria-pressed={lang === "fr"}
            className={`transition-colors ${lang === "fr" ? "text-[#C5A059]" : "text-stone-400 hover:text-stone-700"}`}
          >
            FR
          </button>
          <span className="text-stone-300">/</span>
          <button
            type="button"
            onClick={() => setLang("en")}
            aria-pressed={lang === "en"}
            className={`transition-colors ${lang === "en" ? "text-[#C5A059]" : "text-stone-400 hover:text-stone-700"}`}
          >
            EN
          </button>
        </div>
      </nav>

      <main className="flex-1 px-6 md:px-20 py-20 md:py-28">
        <div className="max-w-3xl mx-auto">
          {/* EN-TÊTE */}
          <header className="mb-16 md:mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-[1px] bg-[#C5A059]" />
              <p className="text-[9px] uppercase tracking-[0.4em] text-[#C5A059] font-medium">
                {t.eyebrow}
              </p>
            </div>

            <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] font-light">
              {t.title}
            </h1>

            <p className="mt-8 text-[9px] uppercase tracking-[0.3em] text-stone-400 font-light">
              {c.updatedLabel} — {t.updated}
            </p>

            <div className="mt-10 space-y-5">
              {t.intro.map((p, i) => (
                <p key={i} className="text-stone-600 font-light leading-[1.9]">
                  {p}
                </p>
              ))}
            </div>
          </header>

          {/* SECTIONS */}
          <div className="space-y-14">
            {t.sections.map((s, i) => (
              <section key={i} className="border-t border-stone-200/70 pt-10">
                <div className="flex items-baseline gap-5">
                  <span className="font-serif text-sm text-[#C5A059]/70 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-serif text-2xl md:text-3xl leading-snug font-light">
                    {s.heading}
                  </h2>
                </div>

                <div className="mt-6 md:pl-10 space-y-5">
                  {s.paragraphs?.map((p, j) => (
                    <p key={j} className="text-stone-600 font-light leading-[1.9]">
                      {p}
                    </p>
                  ))}

                  {s.bullets && (
                    <ul className="space-y-3">
                      {s.bullets.map((b, j) => (
                        <li key={j} className="flex gap-4 text-stone-600 font-light leading-[1.9]">
                          <span className="mt-[0.85em] w-3 h-[1px] bg-[#C5A059]/60 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {s.afterBullets?.map((p, j) => (
                    <p key={j} className="text-stone-600 font-light leading-[1.9]">
                      {p}
                    </p>
                  ))}

                  {s.callout && (
                    <p className="border-l-2 border-[#C5A059] bg-white px-6 py-5 text-stone-700 font-light leading-[1.9] italic">
                      {s.callout}
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>

          {/* CONTACT */}
          <section className="mt-20 bg-[#111111] text-white/70 px-8 md:px-12 py-12">
            <h2 className="font-serif text-2xl md:text-3xl text-white font-light">
              {t.contactTitle}
            </h2>
            <div className="w-10 h-[1px] bg-[#C5A059] my-6" />
            <p className="font-light leading-[1.9] text-white/60">{t.contactText}</p>
            <a
              href={`mailto:${EMAIL}`}
              className="mt-8 inline-flex items-center gap-3 border border-white/15 px-8 py-4 text-[10px] uppercase tracking-[0.3em] font-light text-white hover:border-[#C5A059] hover:text-[#C5A059] transition-all"
            >
              <Mail size={13} strokeWidth={1.5} /> {EMAIL}
            </a>
          </section>

          {/* AUTRE POLITIQUE */}
          <div className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-stone-200/70 pt-10">
            <Link
              href="/"
              className="flex items-center gap-2 text-[9px] uppercase tracking-[0.3em] font-light text-stone-500 hover:text-[#C5A059] transition-colors"
            >
              <ArrowLeft size={13} strokeWidth={1.5} /> {c.back}
            </Link>
            <Link
              href={other.href}
              className="text-[9px] uppercase tracking-[0.3em] font-light text-stone-500 hover:text-[#C5A059] transition-colors"
            >
              {other.label}
            </Link>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-10 text-center border-t border-stone-100 space-y-3">
        <p className="text-[8px] uppercase tracking-[0.3em] font-light text-stone-400">
          {c.rights}
        </p>
        <a
          href="https://lavoiedigital.ca"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[8px] uppercase tracking-[0.3em] font-light text-stone-400 hover:text-[#C5A059] transition-colors"
        >
          {c.credit}
        </a>
      </footer>
    </div>
  );
}
