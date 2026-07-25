import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { BRAND_EMAIL } from '../_lib/mail';

// Configuration de la clé API
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function POST(req: Request) {
  try {
    const { email, name, carrier, trackingNumber } = await req.json();

    // Validation des données
    if (!email || !carrier || !trackingNumber) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // Template HTML avec CSS Inline (Compatible tous clients mail)
    const emailHtml = `
      <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: auto; padding: 50px 20px; color: #1C1C1C; background-color: #ffffff; border: 1px solid #f0f0f0;">
        <div style="text-align: center;">
          <h1 style="text-transform: uppercase; letter-spacing: 6px; font-weight: 300; font-size: 24px; margin-bottom: 10px;">Amélia Ruby</h1>
          <p style="text-transform: uppercase; letter-spacing: 3px; font-size: 10px; color: #999999; margin-bottom: 30px;">Haute Maroquinerie Artisanale</p>
          <div style="height: 1px; background-color: #C5A059; width: 50px; margin: 0 auto 30px auto;"></div>
        </div>
        
        <p style="font-style: italic; font-size: 16px; margin-bottom: 25px;">Bonjour ${name || 'Cher Client'},</p>
        
        <p style="line-height: 1.8; font-size: 15px; margin-bottom: 20px;">
          Votre création a quitté notre atelier. Elle voyage désormais vers vous.
        </p>
        
        <div style="background-color: #FDFCFB; padding: 30px; border: 1px solid #F0F0F0; margin: 30px 0; text-align: center;">
          <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #a8a29e; margin-bottom: 8px;">Transporteur</p>
          <p style="font-size: 16px; margin-bottom: 20px; font-weight: bold; color: #1C1C1C;">${carrier}</p>
          
          <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #a8a29e; margin-bottom: 8px;">Numéro de suivi</p>
          <p style="font-size: 18px; color: #C5A059; letter-spacing: 2px; font-weight: bold;">${trackingNumber}</p>
        </div>
        
        <p style="line-height: 1.8; font-size: 15px; margin-bottom: 40px; text-align: center;">
          Nous espérons que cette pièce vous apportera autant de plaisir que nous en avons eu à la façonner.
        </p>
        
        <div style="border-top: 1px solid #f8f8f8; padding-top: 20px; text-align: center;">
          <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #cccccc;">Montréal — Québec</p>
        </div>
      </div>
    `;

    // Envoi via SendGrid
    await sgMail.send({
      to: email,
      from: {
        email: BRAND_EMAIL,
        name: 'Maison Amélia Ruby'
      },
      replyTo: BRAND_EMAIL,
      subject: 'Votre création est en route — Maison Amélia Ruby',
      text: `Votre colis (${carrier}) avec le numéro ${trackingNumber} a été expédié.`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erreur envoi tracking:", error);
    
    // Log plus détaillé pour le debug
    if (error.response) {
      console.error(error.response.body);
    }

    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'email" }, 
      { status: 500 }
    );
  }
}