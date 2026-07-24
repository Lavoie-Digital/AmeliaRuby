import sgMail from '@sendgrid/mail';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, inventoryCollection } from '../admin/_lib/firebase';

// Adresse qui reçoit les notifications de nouvelles commandes (propriétaire).
const OWNER_EMAIL = process.env.ORDER_NOTIFICATION_EMAIL || 'info@ameliaruby.com';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface ShippingAddress {
  nom?: string | null;
  ligne1?: string | null;
  ligne2?: string | null;
  ville?: string | null;
  province?: string | null;
  codePostal?: string | null;
  pays?: string | null;
}

export interface OrderData {
  /** Identifiant unique de la commande (orderId Square) — sert de clé d'idempotence. */
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  /** Montant total payé (taxes incl.), en dollars. */
  amount: number;
  /** Description lisible des produits (ex. "1x Sac (Noir), 2x Foulard"). */
  produits: string;
  /** Articles du panier pour décrémenter l'inventaire. */
  cartItems: Array<{ id: string; quantity: number }>;
  shippingAddress: ShippingAddress | null;
  /** "production" ou "test" (sandbox). */
  mode: string;
  /** Lien du reçu Square (remplace la facture PDF Stripe). */
  receiptUrl?: string | null;
}

// Échappe le HTML pour éviter toute injection via les champs saisis par le client.
function escapeHtml(str: any): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Exécute les automatisations d'une commande UNE SEULE FOIS, même si appelée
 * plusieurs fois (route de paiement + webhook, ou webhook envoyé en double par Square).
 *
 * L'idempotence est garantie par une transaction Firestore sur clients/{orderId} :
 * le premier appel qui pose le flag `traite: true` fait le travail, les suivants sortent.
 */
export async function processOrderOnce(data: OrderData): Promise<{ processed: boolean }> {
  const {
    orderId,
    customerName,
    customerEmail,
    customerPhone,
    amount,
    produits,
    cartItems,
    shippingAddress,
    mode,
    receiptUrl,
  } = data;

  if (!customerEmail) {
    console.warn('⚠️ [Commande] Aucun courriel client — traitement ignoré.');
    return { processed: false };
  }

  const db = getAdminDb();
  const clientRef = db.collection('clients').doc(orderId);

  // --- GARDE D'IDEMPOTENCE (transaction atomique) ---
  const shouldProcess = await db.runTransaction(async (tx) => {
    const snap = await tx.get(clientRef);
    if (snap.exists && snap.data()?.traite === true) {
      return false; // déjà traité
    }
    tx.set(
      clientRef,
      {
        nom: customerName,
        email: customerEmail,
        telephone: customerPhone,
        totalDepense: amount,
        produits,
        statut: 'À préparer',
        derniereCommande: new Date().toISOString(),
        accepteNewsletter: true,
        mode,
        commandeId: orderId,
        recuUrl: receiptUrl || null,
        traite: true,
        adresseLivraison: shippingAddress
          ? {
              nom: shippingAddress.nom || customerName,
              ligne1: shippingAddress.ligne1 || null,
              ligne2: shippingAddress.ligne2 || null,
              ville: shippingAddress.ville || null,
              province: shippingAddress.province || null,
              codePostal: shippingAddress.codePostal || null,
              pays: shippingAddress.pays || null,
            }
          : null,
      },
      { merge: true }
    );
    return true;
  });

  if (!shouldProcess) {
    console.log(`↩️ [Commande ${orderId}] Déjà traitée — automatisations ignorées.`);
    return { processed: false };
  }

  console.log(`✅ [Commande ${orderId}] Client sauvegardé (${customerEmail}).`);

  // --- DÉCRÉMENTATION DE L'INVENTAIRE ---
  try {
    const inventoryRef = inventoryCollection(db);
    if (!cartItems || cartItems.length === 0) {
      console.warn('⚠️ cartItems vide, rien à décrémenter.');
    }
    for (const item of cartItems || []) {
      if (item.id && item.quantity) {
        await inventoryRef.doc(item.id).update({
          stockQuantity: FieldValue.increment(-item.quantity),
        });
        console.log(`✅ Stock réduit: ${item.id} | -${item.quantity}`);
      } else {
        console.warn('⚠️ Produit ignoré (ID ou quantité manquant):', item);
      }
    }
  } catch (invError: any) {
    console.error('❌ Erreur inventaire:', invError.message);
  }

  // --- COURRIEL DE CONFIRMATION AU CLIENT ---
  try {
    const emailHtml = `
      <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: auto; padding: 50px 20px; color: #1C1C1C; background-color: #ffffff; border: 1px solid #f0f0f0;">
        <div style="text-align: center;">
          <h1 style="text-transform: uppercase; letter-spacing: 6px; font-weight: 300; font-size: 24px; margin-bottom: 10px;">Amélia Ruby</h1>
          <p style="text-transform: uppercase; letter-spacing: 3px; font-size: 10px; color: #999; margin-bottom: 30px;">Haute Maroquinerie Artisanale</p>
          <div style="height: 1px; background: #C5A059; width: 50px; margin: 0 auto 30px auto;"></div>
        </div>
        <p style="font-style: italic;">Bonjour ${escapeHtml(customerName)},</p>
        <p style="line-height: 1.8;">C’est un privilège pour nous de savoir qu'une de nos créations vous accompagnera bientôt. Votre commande est actuellement en cours de préparation dans notre atelier.</p>
        <p style="line-height: 1.8;"><strong>Un numéro de suivi vous sera transmis personnellement</strong> par courriel dès que votre colis aura été confié à notre transporteur.</p>
        ${receiptUrl ? `<p style="text-align: center; margin-top: 30px;"><a href="${escapeHtml(receiptUrl)}" style="color: #C5A059; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Voir mon reçu</a></p>` : ''}
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
    console.log(`✅ Courriel envoyé à ${customerEmail}`);
  } catch (emailError: any) {
    console.error('❌ Erreur courriel client:', emailError.message);
  }

  // --- NOTIFICATION À LA PROPRIÉTAIRE ---
  try {
    const modeLabel = mode === 'production' ? '' : ' [TEST]';
    const dateStr = new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' });

    const addressBlock = shippingAddress
      ? `
        <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #a8a29e; margin: 0 0 6px 0;">Adresse de livraison</p>
        <p style="font-size: 15px; margin: 0 0 18px 0; line-height: 1.6;">
          ${escapeHtml(shippingAddress.nom || customerName)}<br />
          ${escapeHtml(shippingAddress.ligne1 || '')}${shippingAddress.ligne2 ? '<br />' + escapeHtml(shippingAddress.ligne2) : ''}<br />
          ${escapeHtml(shippingAddress.ville || '')} ${escapeHtml(shippingAddress.province || '')} ${escapeHtml(shippingAddress.codePostal || '')}<br />
          ${escapeHtml(shippingAddress.pays || '')}
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

        <p style="font-size: 11px; color: #999; text-align: center; margin: 0;">N° de commande : ${escapeHtml(orderId)}</p>
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
        ? `Livraison :\n${shippingAddress.nom || customerName}\n${shippingAddress.ligne1 || ''}\n${shippingAddress.ligne2 ? shippingAddress.ligne2 + '\n' : ''}${shippingAddress.ville || ''} ${shippingAddress.province || ''} ${shippingAddress.codePostal || ''}\n${shippingAddress.pays || ''}\n\n`
        : 'Aucune adresse de livraison fournie.\n\n') +
      `N° de commande : ${orderId}`;

    await sgMail.send({
      to: OWNER_EMAIL,
      from: { email: 'info@ameliaruby.com', name: 'Boutique Amélia Ruby' },
      replyTo: customerEmail,
      subject: `🛍️ Nouvelle commande${modeLabel} — ${amount.toFixed(2)} $ — ${customerName}`,
      text: ownerText,
      html: ownerHtml,
    });
    console.log(`✅ Notification envoyée à ${OWNER_EMAIL}`);
  } catch (ownerEmailError: any) {
    console.error('❌ Erreur notification propriétaire:', ownerEmailError.message);
  }

  return { processed: true };
}
