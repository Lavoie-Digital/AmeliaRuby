import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Configuration de la clé API
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const CONTACT_EMAIL = 'info@ameliaruby.com';

// Échappe le HTML pour éviter toute injection dans les templates
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = (body.name || '').toString().trim();
    const email = (body.email || '').toString().trim();
    const message = (body.message || '').toString().trim();
    const lang: 'fr' | 'en' = body.lang === 'en' ? 'en' : 'fr';

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Courriel invalide' }, { status: 400 });
    }

    if (!process.env.SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY manquante');
      return NextResponse.json({ error: "Service d'envoi indisponible" }, { status: 500 });
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');

    // 1) Notification à la maison (info@ameliaruby.com)
    const ownerHtml = `
      <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: auto; padding: 40px 20px; color: #1C1C1C; background-color: #ffffff; border: 1px solid #f0f0f0;">
        <div style="text-align: center;">
          <h1 style="text-transform: uppercase; letter-spacing: 6px; font-weight: 300; font-size: 22px; margin-bottom: 8px;">Amélia Ruby</h1>
          <p style="text-transform: uppercase; letter-spacing: 3px; font-size: 10px; color: #999999; margin-bottom: 24px;">Nouveau message de contact</p>
          <div style="height: 1px; background-color: #C5A059; width: 50px; margin: 0 auto 30px auto;"></div>
        </div>
        <div style="background-color: #FDFCFB; padding: 24px; border: 1px solid #F0F0F0; margin-bottom: 24px;">
          <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #a8a29e; margin: 0 0 6px 0;">Nom</p>
          <p style="font-size: 16px; margin: 0 0 18px 0; color: #1C1C1C;">${safeName}</p>
          <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #a8a29e; margin: 0 0 6px 0;">Courriel</p>
          <p style="font-size: 16px; margin: 0; color: #C5A059;">${safeEmail}</p>
        </div>
        <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #a8a29e; margin: 0 0 8px 0;">Message</p>
        <p style="line-height: 1.8; font-size: 15px; white-space: pre-wrap;">${safeMessage}</p>
        <div style="border-top: 1px solid #f8f8f8; padding-top: 20px; margin-top: 30px; text-align: center;">
          <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #cccccc;">Montréal — Québec</p>
        </div>
      </div>
    `;

    await sgMail.send({
      to: CONTACT_EMAIL,
      from: { email: CONTACT_EMAIL, name: 'Site Amélia Ruby' },
      replyTo: { email, name },
      subject: `Nouveau message de ${name} — Formulaire de contact`,
      text: `Nom: ${name}\nCourriel: ${email}\n\nMessage:\n${message}`,
      html: ownerHtml,
    });

    // 2) Accusé de réception automatique au client (délai 24h)
    const t = lang === 'en'
      ? {
          subject: 'We have received your message — Maison Amélia Ruby',
          greeting: `Hello ${safeName},`,
          intro: 'Thank you for reaching out to Maison Amélia Ruby. We have received your message and one of our artisans will get back to you.',
          delay: 'Response time: within 24 hours',
          recap: 'Your message',
          outro: 'With care,<br />The Amélia Ruby team',
          text: `Hello ${name},\n\nThank you for reaching out to Maison Amélia Ruby. We have received your message and will get back to you within 24 hours.\n\nYour message:\n${message}\n\nThe Amélia Ruby team`,
        }
      : {
          subject: 'Nous avons bien reçu votre message — Maison Amélia Ruby',
          greeting: `Bonjour ${safeName},`,
          intro: "Merci d'avoir contacté la Maison Amélia Ruby. Nous avons bien reçu votre message et l'un de nos artisans reviendra vers vous.",
          delay: 'Délai de réponse : sous 24 heures',
          recap: 'Votre message',
          outro: 'Avec soin,<br />L\'équipe Amélia Ruby',
          text: `Bonjour ${name},\n\nMerci d'avoir contacté la Maison Amélia Ruby. Nous avons bien reçu votre message et vous répondrons dans un délai de 24 heures.\n\nVotre message :\n${message}\n\nL'équipe Amélia Ruby`,
        };

    const autoReplyHtml = `
      <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: auto; padding: 50px 20px; color: #1C1C1C; background-color: #ffffff; border: 1px solid #f0f0f0;">
        <div style="text-align: center;">
          <h1 style="text-transform: uppercase; letter-spacing: 6px; font-weight: 300; font-size: 24px; margin-bottom: 10px;">Amélia Ruby</h1>
          <p style="text-transform: uppercase; letter-spacing: 3px; font-size: 10px; color: #999999; margin-bottom: 30px;">Haute Maroquinerie Artisanale</p>
          <div style="height: 1px; background-color: #C5A059; width: 50px; margin: 0 auto 30px auto;"></div>
        </div>
        <p style="font-style: italic; font-size: 16px; margin-bottom: 25px;">${t.greeting}</p>
        <p style="line-height: 1.8; font-size: 15px; margin-bottom: 25px;">${t.intro}</p>
        <div style="background-color: #FDFCFB; padding: 20px; border: 1px solid #F0F0F0; margin: 0 0 30px 0; text-align: center;">
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #C5A059; margin: 0; font-weight: bold;">${t.delay}</p>
        </div>
        <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #a8a29e; margin: 0 0 8px 0;">${t.recap}</p>
        <p style="line-height: 1.8; font-size: 14px; color: #666; white-space: pre-wrap; margin-bottom: 40px;">${safeMessage}</p>
        <div style="border-top: 1px solid #f8f8f8; padding-top: 20px; text-align: center;">
          <p style="line-height: 1.8; font-size: 14px; margin-bottom: 16px;">${t.outro}</p>
          <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #cccccc;">Montréal — Québec</p>
        </div>
      </div>
    `;

    await sgMail.send({
      to: email,
      from: { email: CONTACT_EMAIL, name: 'Maison Amélia Ruby' },
      replyTo: CONTACT_EMAIL,
      subject: t.subject,
      text: t.text,
      html: autoReplyHtml,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur envoi contact:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du message" },
      { status: 500 }
    );
  }
}
