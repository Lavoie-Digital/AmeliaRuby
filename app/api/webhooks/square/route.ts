export const dynamic = 'force-dynamic'; // Empêche Next.js de mettre en cache cette route

import { NextResponse } from 'next/server';
import { WebhooksHelper } from 'square';
import { getAdminDb } from '../../admin/_lib/firebase';
import { processOrderOnce, type OrderData } from '../../_lib/orderProcessing';

/**
 * URL exacte configurée dans le tableau de bord Square (Developer → Webhooks).
 * DOIT correspondre au caractère près, sinon la vérification de signature échoue.
 * Définir SQUARE_WEBHOOK_URL en production (ex. https://ameliaruby.com/api/webhooks/square).
 */
function getNotificationUrl(req: Request): string {
  if (process.env.SQUARE_WEBHOOK_URL) return process.env.SQUARE_WEBHOOK_URL;
  const url = new URL(req.url);
  return `${url.origin}/api/webhooks/square`;
}

export async function POST(req: Request) {
  console.log("🚀 [Webhook Square] Requête reçue.");

  const body = await req.text();
  const signature = req.headers.get('x-square-hmacsha256-signature') || '';
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (!signatureKey) {
    console.error('❌ [Webhook Square] SQUARE_WEBHOOK_SIGNATURE_KEY manquant.');
    return NextResponse.json({ error: 'Config error' }, { status: 500 });
  }
  if (!signature) {
    console.error('❌ [Webhook Square] Signature absente.');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  // --- Vérification de la signature HMAC-SHA256 de Square ---
  let isValid = false;
  try {
    isValid = await WebhooksHelper.verifySignature({
      requestBody: body,
      signatureHeader: signature,
      signatureKey,
      notificationUrl: getNotificationUrl(req),
    });
  } catch (err: any) {
    console.error('❌ [Webhook Square] Erreur vérification signature:', err.message);
    return NextResponse.json({ error: 'Signature check failed' }, { status: 400 });
  }

  if (!isValid) {
    console.error('❌ [Webhook Square] Signature invalide.');
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const eventType: string = event?.type || '';
  console.log(`✅ [Webhook Square] Événement vérifié : ${eventType}`);

  // On agit sur les paiements complétés.
  if (eventType === 'payment.created' || eventType === 'payment.updated') {
    const payment = event?.data?.object?.payment;
    const status = payment?.status;
    const orderId = payment?.order_id;

    if (status === 'COMPLETED' && orderId) {
      console.log(`💳 [Webhook Square] Paiement complété pour la commande ${orderId}.`);
      try {
        const db = getAdminDb();
        const snap = await db.collection('pendingOrders').doc(orderId).get();

        if (!snap.exists) {
          // La route de paiement traite déjà la commande en synchrone; si le doc
          // n'existe pas encore, on ne peut pas reconstruire le panier ici.
          console.warn(`⚠️ [Webhook Square] Aucun pendingOrders/${orderId} — traitement délégué à la route de paiement.`);
        } else {
          const orderData = snap.data() as OrderData;
          await processOrderOnce({ ...orderData, orderId });
        }
      } catch (err: any) {
        console.error('❌ [Webhook Square] Erreur traitement:', err.message);
        // On renvoie tout de même 200 pour éviter les retentatives infinies;
        // la route de paiement synchrone a déjà exécuté les automatisations.
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
