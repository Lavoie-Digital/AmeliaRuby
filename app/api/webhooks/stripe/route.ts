export const dynamic = 'force-dynamic'; // CRUCIAL: Empêche Next.js de mettre en cache cette route

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import sgMail from '@sendgrid/mail';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';

// --- INITIALISATION SÉCURISÉE ---
let db: Firestore;

const initAdmin = () => {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error("❌ ERREUR: Variables Firebase Admin manquantes dans le .env.");
      throw new Error("Variables Firebase Admin manquantes.");
    }

    let formattedKey = privateKey.trim();
    if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) formattedKey = formattedKey.slice(1, -1);
    else if (formattedKey.startsWith("'") && formattedKey.endsWith("'")) formattedKey = formattedKey.slice(1, -1);
    
    formattedKey = formattedKey.replace(/\\n/g, '\n');

    if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----\n')) formattedKey = formattedKey.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
    if (!formattedKey.includes('\n-----END PRIVATE KEY-----')) formattedKey = formattedKey.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');

    try {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey: formattedKey }) });
      console.log("✅ [Firebase Admin] Initialisation réussie.");
    } catch (err: any) {
      console.error("❌ [Firebase Admin] Échec de l'initialisation:", err.message);
    }
  }
  db = getFirestore();
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia' as any,
});

// Adresse qui reçoit les notifications de nouvelles commandes (propriétaire).
const OWNER_EMAIL = process.env.ORDER_NOTIFICATION_EMAIL || 'info@ameliaruby.com';

// Échappe le HTML pour éviter toute injection via les champs saisis par le client.
function escapeHtml(str: any): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function POST(req: Request) {
  console.log("🚀 [Webhook] REQUÊTE REÇUE SUR L'API !");
  
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error("❌ [Webhook] ERREUR: Aucune signature Stripe (stripe-signature) trouvée dans les headers.");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("❌ [Webhook] ERREUR: STRIPE_WEBHOOK_SECRET est manquant dans tes variables d'environnement.");
    return NextResponse.json({ error: "Config error" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    console.log(`✅ [Webhook] Signature vérifiée avec succès. Type d'événement : ${event.type}`);
  } catch (err: any) {
    console.error("❌ [Webhook] ÉCHEC DE LA SIGNATURE STRIPE:", err.message);
    return NextResponse.json({ error: `Signature invalide: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    console.log("💳 [Webhook] Paiement complété détecté ! Début du traitement...");
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_details?.email || session.customer_email;
    const customerName = session.customer_details?.name || "Client";
    const customerPhone = session.customer_details?.phone || null;
    const amount = (session.amount_total || 0) / 100;

    // Adresse de livraison (présente même via Apple Pay si shipping_address_collection est activé)
    const shipping = (session as any).shipping_details || (session as any).collected_information?.shipping_details;
    const shippingAddress = shipping?.address || session.customer_details?.address || null;
    const shippingName = shipping?.name || customerName;

    const produits = session.metadata?.produits || "";
    const cartItemsData = session.metadata?.cartItems || "[]";

    console.log(`📦 Données du panier reçues : ${cartItemsData}`);
    if (shippingAddress) {
      console.log(`📮 Adresse livraison : ${shippingAddress.line1}, ${shippingAddress.city}, ${shippingAddress.postal_code}, ${shippingAddress.country}`);
    }

    if (customerEmail) {
      try {
        initAdmin();

        // --- SAUVEGARDE FIREBASE CLIENT ---
        console.log("🔄 Sauvegarde du client dans Firebase...");
        await db.collection('clients').doc(session.id).set({
          nom: customerName,
          email: customerEmail,
          telephone: customerPhone,
          totalDepense: amount,
          produits: produits,
          statut: 'À préparer',
          derniereCommande: new Date().toISOString(),
          accepteNewsletter: true,
          mode: session.livemode ? "production" : "test",
          commandeId: session.id,
          // Adresse de livraison structurée
          adresseLivraison: shippingAddress ? {
            nom: shippingName,
            ligne1: shippingAddress.line1 || null,
            ligne2: shippingAddress.line2 || null,
            ville: shippingAddress.city || null,
            province: shippingAddress.state || null,
            codePostal: shippingAddress.postal_code || null,
            pays: shippingAddress.country || null,
          } : null,
        }, { merge: true });
        console.log(`✅ Client sauvegardé avec succès (${customerEmail}).`);

        // --- DÉCRÉMENTATION DE L'INVENTAIRE ---
        try {
          console.log("🔄 Mise à jour de l'inventaire...");
          const cartItems = JSON.parse(cartItemsData);
          const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'default-app-id';
          console.log(`🔍 Utilisation de l'App ID Firebase : ${appId}`);
          
          const inventoryRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('inventory');

          if (cartItems.length === 0) {
            console.warn("⚠️ Attention : cartItems est vide, rien à décrémenter.");
          }

          for (const item of cartItems) {
            if (item.id && item.quantity) {
              await inventoryRef.doc(item.id).update({
                stockQuantity: FieldValue.increment(-item.quantity)
              });
              console.log(`✅ Stock réduit avec succès ! Produit: ${item.id} | Quantité: -${item.quantity}`);
            } else {
              console.warn(`⚠️ Produit ignoré car ID ou quantité manquant :`, item);
            }
          }
        } catch (invError: any) {
          console.error("❌ ERREUR lors de la mise à jour de l'inventaire:", invError.message);
        }

        // --- ENVOI EMAIL ---
        try {
          console.log("🔄 Tentative d'envoi de courriel via SendGrid...");
          const emailHtml = `
            <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: auto; padding: 50px 20px; color: #1C1C1C; background-color: #ffffff; border: 1px solid #f0f0f0;">
              <div style="text-align: center;">
                <h1 style="text-transform: uppercase; letter-spacing: 6px; font-weight: 300; font-size: 24px; margin-bottom: 10px;">Amélia Ruby</h1>
                <p style="text-transform: uppercase; letter-spacing: 3px; font-size: 10px; color: #999; margin-bottom: 30px;">Haute Maroquinerie Artisanale</p>
                <div style="height: 1px; background: #C5A059; width: 50px; margin: 0 auto 30px auto;"></div>
              </div>
              <p style="font-style: italic;">Bonjour ${customerName},</p>
              <p style="line-height: 1.8;">C’est un privilège pour nous de savoir qu'une de nos créations vous accompagnera bientôt. Votre commande est actuellement en cours de préparation dans notre atelier.</p>
              <p style="line-height: 1.8;"><strong>Un numéro de suivi vous sera transmis personnellement</strong> par courriel dès que votre colis aura été confié à notre transporteur.</p>
              <p style="text-align: center; margin-top: 40px; font-size: 10px; color: #bbb; letter-spacing: 2px;">Montréal — Québec</p>
            </div>
          `;

          await sgMail.send({
            to: customerEmail,
            from: 'Maison Amélia Ruby <info@ameliaruby.com>',
            replyTo: 'info@ameliaruby.com',
            subject: 'Merci de votre confiance — Maison Amélia Ruby',
            text: `Bonjour ${customerName}, votre commande est en cours de préparation.`,
            html: emailHtml,
          });
          console.log(`✅ Courriel envoyé avec succès à ${customerEmail}`);
        } catch (emailError: any) {
          console.error("❌ ERREUR lors de l'envoi du courriel SendGrid:", emailError.message);
        }

        // --- NOTIFICATION DE COMMANDE À LA PROPRIÉTAIRE ---
        try {
          console.log(`🔔 Notification de nouvelle commande à ${OWNER_EMAIL}...`);

          const modeLabel = session.livemode ? '' : ' [TEST]';
          const dateStr = new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' });

          const addressBlock = shippingAddress
            ? `
              <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #a8a29e; margin: 0 0 6px 0;">Adresse de livraison</p>
              <p style="font-size: 15px; margin: 0 0 18px 0; line-height: 1.6;">
                ${escapeHtml(shippingName)}<br />
                ${escapeHtml(shippingAddress.line1 || '')}${shippingAddress.line2 ? '<br />' + escapeHtml(shippingAddress.line2) : ''}<br />
                ${escapeHtml(shippingAddress.city || '')} ${escapeHtml(shippingAddress.state || '')} ${escapeHtml(shippingAddress.postal_code || '')}<br />
                ${escapeHtml(shippingAddress.country || '')}
              </p>`
            : `<p style="font-size: 13px; color: #b91c1c; margin: 0 0 18px 0;">Aucune adresse de livraison fournie.</p>`;

          const ownerHtml = `
            <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: auto; padding: 40px 20px; color: #1C1C1C; background-color: #ffffff; border: 1px solid #f0f0f0;">
              <div style="text-align: center;">
                <h1 style="text-transform: uppercase; letter-spacing: 6px; font-weight: 300; font-size: 22px; margin-bottom: 8px;">Amélia Ruby</h1>
                <p style="text-transform: uppercase; letter-spacing: 3px; font-size: 10px; color: #999999; margin-bottom: 24px;">Nouvelle commande${modeLabel}</p>
                <div style="height: 1px; background-color: #C5A059; width: 50px; margin: 0 auto 30px auto;"></div>
              </div>

              <div style="text-align: center; margin-bottom: 30px;">
                <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #a8a29e; margin: 0 0 6px 0;">Montant total (taxes incl.)</p>
                <p style="font-size: 30px; margin: 0; color: #C5A059; font-weight: bold;">${amount.toFixed(2)} $ CAD</p>
                <p style="font-size: 11px; color: #999; margin: 8px 0 0 0;">${escapeHtml(dateStr)}</p>
              </div>

              <div style="background-color: #FDFCFB; padding: 24px; border: 1px solid #F0F0F0; margin-bottom: 24px;">
                <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #a8a29e; margin: 0 0 6px 0;">Produits</p>
                <p style="font-size: 16px; margin: 0 0 18px 0; line-height: 1.6;">${escapeHtml(produits) || '—'}</p>

                <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #a8a29e; margin: 0 0 6px 0;">Client</p>
                <p style="font-size: 15px; margin: 0 0 4px 0;">${escapeHtml(customerName)}</p>
                <p style="font-size: 15px; margin: 0 0 4px 0; color: #C5A059;">${escapeHtml(customerEmail)}</p>
                <p style="font-size: 15px; margin: 0 0 18px 0;">${customerPhone ? escapeHtml(customerPhone) : 'Aucun téléphone fourni'}</p>

                ${addressBlock}
              </div>

              <p style="font-size: 11px; color: #999; text-align: center; margin: 0;">N° de commande : ${escapeHtml(session.id)}</p>
              <div style="border-top: 1px solid #f8f8f8; padding-top: 20px; margin-top: 30px; text-align: center;">
                <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #cccccc;">Montréal — Québec</p>
              </div>
            </div>
          `;

          const ownerText =
            `Nouvelle commande${modeLabel}\n\n` +
            `Montant : ${amount.toFixed(2)} $ CAD (taxes incl.)\n` +
            `Date : ${dateStr}\n\n` +
            `Produits : ${produits || '—'}\n\n` +
            `Client : ${customerName}\n` +
            `Courriel : ${customerEmail}\n` +
            `Téléphone : ${customerPhone || 'Aucun'}\n\n` +
            (shippingAddress
              ? `Livraison :\n${shippingName}\n${shippingAddress.line1 || ''}\n${shippingAddress.line2 ? shippingAddress.line2 + '\n' : ''}${shippingAddress.city || ''} ${shippingAddress.state || ''} ${shippingAddress.postal_code || ''}\n${shippingAddress.country || ''}\n\n`
              : 'Aucune adresse de livraison fournie.\n\n') +
            `N° de commande : ${session.id}`;

          await sgMail.send({
            to: OWNER_EMAIL,
            from: { email: 'info@ameliaruby.com', name: 'Boutique Amélia Ruby' },
            replyTo: customerEmail,
            subject: `🛍️ Nouvelle commande${modeLabel} — ${amount.toFixed(2)} $ — ${customerName}`,
            text: ownerText,
            html: ownerHtml,
          });
          console.log(`✅ Notification de commande envoyée à ${OWNER_EMAIL}`);
        } catch (ownerEmailError: any) {
          console.error("❌ ERREUR lors de l'envoi de la notification de commande:", ownerEmailError.message);
        }

      } catch (error: any) {
        console.error("❌ ERREUR GLOBALE dans le traitement du webhook:", error.message);
      }
    }
  }

  // Toujours renvoyer un 200 à la fin si la signature était bonne,
  // sinon Stripe réessaiera la requête en boucle pendant des jours.
  console.log("🏁 [Webhook] Fin du script, renvoi du statut 200 à Stripe.");
  return NextResponse.json({ received: true }, { status: 200 });
}