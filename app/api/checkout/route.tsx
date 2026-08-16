import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { Square } from 'square';
import { getSquareClient, getLocationId, getTaxRate, taxPercentageString } from '../_lib/square';
import { getAdminDb } from '../admin/_lib/firebase';
import { processOrderOnce, type OrderData } from '../_lib/orderProcessing';

export const dynamic = 'force-dynamic';

// Livraison : frais fixes de 18 $ tant que le sous-total (avant taxes) est
// sous le seuil de 400 $ ; livraison offerte à partir de 400 $.
const SHIPPING_FEE_CENTS = 1800;
const FREE_SHIPPING_MIN_CENTS = 40000;

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
}

interface ShippingInfo {
  line1?: string;
  line2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Valide un code promo dans Firestore et retourne le % de rabais applicable.
 * Retourne null si le code est absent, inactif, expiré ou épuisé.
 */
async function resolvePromo(rawCode: string | undefined) {
  if (!rawCode) return null;
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;

  const db = getAdminDb();
  const snap = await db.collection('promoCodes').doc(code).get();
  if (!snap.exists) return null;

  const p = snap.data() as any;
  if (p.active === false || p.hidden === true) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (p.expiresAt && Number(p.expiresAt) < nowSec) return null;
  if (p.maxRedemptions && Number(p.timesRedeemed || 0) >= Number(p.maxRedemptions)) return null;

  const percentOff = Number(p.percentOff);
  if (!Number.isFinite(percentOff) || percentOff <= 0) return null;

  return { code, percentOff };
}

/**
 * Normalise un numéro de téléphone au format E.164 exigé par Square.
 * Retourne undefined si le format est inconnu (le numéro brut reste conservé
 * dans Firestore / les courriels, il n'est simplement pas envoyé à Square).
 */
function toE164(phone?: string, country?: string): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    return /^\+\d{8,15}$/.test(cleaned) ? cleaned : undefined;
  }
  const digits = cleaned.replace(/\D/g, '');
  const c = (country || '').toUpperCase();
  if (digits.length === 10 && (c === 'CA' || c === 'US' || c === '')) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items: CartItem[] = body.items || [];
    const sourceId: string | undefined = body.sourceId;
    const verificationToken: string | undefined = body.verificationToken;
    const customer: CustomerInfo = body.customer || {};
    const shipping: ShippingInfo = body.shipping || {};
    const promoInput: string | undefined = body.promoCode;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Le panier est vide.' }, { status: 400 });
    }
    if (!sourceId) {
      return NextResponse.json({ error: 'Jeton de paiement manquant.' }, { status: 400 });
    }
    if (!customer.email) {
      return NextResponse.json({ error: 'Courriel requis.' }, { status: 400 });
    }

    const client = getSquareClient();
    const locationId = await getLocationId();

    const orderDescription = items.map((i) => `${i.quantity}x ${i.name}`).join(', ');

    // --- Line items Square ---
    const lineItems: Square.OrderLineItem[] = items.map((item) => ({
      name: item.name,
      quantity: String(item.quantity),
      basePriceMoney: {
        amount: BigInt(Math.round(item.price * 100)),
        currency: 'CAD',
      },
    }));

    // --- Rabais (code promo, portée commande) ---
    const promo = await resolvePromo(promoInput);
    const discounts: Square.OrderLineItemDiscount[] | undefined = promo
      ? [
          {
            uid: 'promo',
            name: `Code promo ${promo.code}`,
            percentage: String(promo.percentOff),
            scope: 'ORDER',
          },
        ]
      : undefined;

    // --- Taxes canadiennes selon la province de livraison (portée commande) ---
    const taxRate = getTaxRate(shipping.country, shipping.province);
    const taxes: Square.OrderLineItemTax[] | undefined =
      taxRate > 0
        ? [
            {
              uid: 'tax',
              name: 'Taxes (TPS/TVQ/TVH)',
              percentage: taxPercentageString(taxRate),
              scope: 'ORDER',
            },
          ]
        : undefined;

    // --- Frais de livraison : 18 $ si le sous-total (avant taxes) est < 400 $ ---
    // Ajouté comme « service charge » taxable : la taxe s'y applique, mais le
    // code promo (portée ORDER) ne l'escompte pas.
    const subtotalCents = items.reduce((sum, i) => sum + Math.round(i.price * 100) * i.quantity, 0);
    const shippingCents = subtotalCents < FREE_SHIPPING_MIN_CENTS ? SHIPPING_FEE_CENTS : 0;
    const serviceCharges: Square.OrderServiceCharge[] | undefined =
      shippingCents > 0
        ? [
            {
              uid: 'shipping',
              name: 'Livraison',
              amountMoney: { amount: BigInt(shippingCents), currency: 'CAD' },
              calculationPhase: 'SUBTOTAL_PHASE',
              taxable: true,
            },
          ]
        : undefined;

    // --- Adresse de livraison (partagée : fulfillment Square + paiement + Firestore) ---
    const shippingAddress: Square.Address | undefined =
      shipping.line1 || shipping.city
        ? {
            addressLine1: shipping.line1 || undefined,
            addressLine2: shipping.line2 || undefined,
            locality: shipping.city || undefined,
            administrativeDistrictLevel1: shipping.province || undefined,
            postalCode: shipping.postalCode || undefined,
            country: (shipping.country || undefined) as any,
            firstName: customer.name || undefined,
          }
        : undefined;

    // --- Fulfillment : fait apparaître la commande dans « Commandes » du tableau
    // de bord Square (avec le nom et l'adresse), et non seulement dans les
    // transactions. État PROPOSED = « à préparer » ; la commande reste donc OPEN
    // côté Square jusqu'à l'expédition, même une fois payée.
    const fulfillments: Square.Fulfillment[] | undefined = shippingAddress
      ? [
          {
            type: 'SHIPMENT',
            state: 'PROPOSED',
            shipmentDetails: {
              recipient: {
                displayName: customer.name || 'Client',
                emailAddress: customer.email,
                phoneNumber: toE164(customer.phone, shipping.country),
                address: shippingAddress,
              },
            },
          },
        ]
      : undefined;

    // --- Création de la commande Square (calcule sous-total, rabais, livraison, taxes) ---
    const orderPayload = {
      locationId,
      lineItems,
      discounts,
      serviceCharges,
      taxes,
      metadata: {
        produits: orderDescription.slice(0, 255),
      },
    };

    // Le fulfillment est un confort d'affichage : s'il fait échouer la création
    // (adresse refusée par Square, etc.), on réessaie sans lui plutôt que de
    // faire échouer une vente.
    let orderRes;
    try {
      orderRes = await client.orders.create({
        idempotencyKey: randomUUID(),
        order: { ...orderPayload, fulfillments },
      });
    } catch (fulfillErr: any) {
      if (!fulfillments) throw fulfillErr;
      console.error(
        '⚠️ Création de commande avec fulfillment refusée, nouvelle tentative sans:',
        fulfillErr?.errors?.[0]?.detail || fulfillErr?.message
      );
      orderRes = await client.orders.create({
        idempotencyKey: randomUUID(),
        order: orderPayload,
      });
    }

    const order = orderRes.order;
    if (!order?.id || !order.totalMoney?.amount) {
      return NextResponse.json({ error: 'Échec de la création de la commande.' }, { status: 502 });
    }

    // --- Paiement (Web Payments SDK: sourceId = jeton de carte) ---
    const paymentRes = await client.payments.create({
      sourceId,
      verificationToken,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: order.totalMoney.amount,
        currency: 'CAD',
      },
      orderId: order.id,
      locationId,
      buyerEmailAddress: customer.email,
      buyerPhoneNumber: toE164(customer.phone, shipping.country),
      shippingAddress,
      note: `Commande: ${orderDescription}`.slice(0, 500),
      autocomplete: true,
    });

    let payment = paymentRes.payment;

    // APPROVED = carte autorisée mais argent PAS encaissé (l'autorisation expire
    // d'elle-même après quelques jours). Avec autocomplete: true ça ne devrait pas
    // se produire, mais si ça arrive on capture explicitement : on ne confirme
    // jamais une commande dont les fonds ne sont pas pris.
    if (payment?.status === 'APPROVED' && payment.id) {
      try {
        const completed = await client.payments.complete({ paymentId: payment.id });
        payment = completed.payment || payment;
        console.log(`💳 Paiement ${payment.id} capturé explicitement (statut initial APPROVED).`);
      } catch (e: any) {
        console.error('❌ Capture du paiement APPROVED échouée:', e?.errors?.[0]?.detail || e.message);
      }
    }

    if (!payment || payment.status !== 'COMPLETED') {
      // Libère l'autorisation pour ne pas laisser de fonds bloqués sur la carte.
      if (payment?.status === 'APPROVED' && payment.id) {
        try {
          await client.payments.cancel({ paymentId: payment.id });
          console.log(`↩️ Autorisation ${payment.id} annulée (non capturable).`);
        } catch (e: any) {
          console.error('❌ Annulation de l\'autorisation échouée:', e?.errors?.[0]?.detail || e.message);
        }
      }
      return NextResponse.json(
        {
          error: `Paiement non complété (statut : ${payment?.status || 'inconnu'}). Aucun montant n'a été encaissé.`,
        },
        { status: 402 }
      );
    }

    const amountDollars = Number(order.totalMoney.amount) / 100;
    const mode =
      (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase() === 'production'
        ? 'production'
        : 'test';

    const orderData: OrderData = {
      orderId: order.id,
      customerName: customer.name || 'Client',
      customerEmail: customer.email,
      customerPhone: customer.phone || null,
      amount: amountDollars,
      produits: orderDescription,
      cartItems: items.map((i) => ({ id: i.id, quantity: i.quantity })),
      shippingAddress: shippingAddress
        ? {
            nom: customer.name || 'Client',
            ligne1: shipping.line1 || null,
            ligne2: shipping.line2 || null,
            ville: shipping.city || null,
            province: shipping.province || null,
            codePostal: shipping.postalCode || null,
            pays: shipping.country || null,
          }
        : null,
      mode,
      receiptUrl: payment.receiptUrl || null,
    };

    // Copie de secours pour le webhook (au cas où il arrive avant/après).
    try {
      const db = getAdminDb();
      await db.collection('pendingOrders').doc(order.id).set(orderData, { merge: true });
    } catch (e: any) {
      console.error('⚠️ Impossible d\'écrire pendingOrders:', e.message);
    }

    // Exécute les automatisations immédiatement (idempotent — le webhook ne refera rien).
    await processOrderOnce(orderData);

    // Incrémente le compteur d'utilisation du code promo.
    if (promo) {
      try {
        const db = getAdminDb();
        const { FieldValue } = await import('firebase-admin/firestore');
        await db.collection('promoCodes').doc(promo.code).update({
          timesRedeemed: FieldValue.increment(1),
        });
      } catch (e: any) {
        console.error('⚠️ Incrément code promo échoué:', e.message);
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentId: payment.id,
      receiptUrl: payment.receiptUrl || null,
      amount: amountDollars,
    });
  } catch (error: any) {
    // Erreurs Square: message lisible si disponible
    const sqErrors = error?.errors || error?.body?.errors;
    const message = Array.isArray(sqErrors) && sqErrors[0]?.detail ? sqErrors[0].detail : error?.message || 'Erreur inconnue';
    console.error('Erreur Square checkout:', message, sqErrors || '');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
