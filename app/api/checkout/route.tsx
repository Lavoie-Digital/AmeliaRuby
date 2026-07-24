import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { Square } from 'square';
import { getSquareClient, getLocationId, getTaxRate, taxPercentageString } from '../_lib/square';
import { getAdminDb } from '../admin/_lib/firebase';
import { processOrderOnce, type OrderData } from '../_lib/orderProcessing';

export const dynamic = 'force-dynamic';

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

    // --- Création de la commande Square (calcule sous-total, rabais, taxes) ---
    const orderRes = await client.orders.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId,
        lineItems,
        discounts,
        taxes,
        metadata: {
          produits: orderDescription.slice(0, 255),
        },
      },
    });

    const order = orderRes.order;
    if (!order?.id || !order.totalMoney?.amount) {
      return NextResponse.json({ error: 'Échec de la création de la commande.' }, { status: 502 });
    }

    // --- Paiement (Web Payments SDK: sourceId = jeton de carte) ---
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
      buyerPhoneNumber: customer.phone || undefined,
      shippingAddress,
      note: `Commande: ${orderDescription}`.slice(0, 500),
      autocomplete: true,
    });

    const payment = paymentRes.payment;
    if (!payment || (payment.status !== 'COMPLETED' && payment.status !== 'APPROVED')) {
      return NextResponse.json(
        { error: `Paiement non complété (statut: ${payment?.status || 'inconnu'}).` },
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
