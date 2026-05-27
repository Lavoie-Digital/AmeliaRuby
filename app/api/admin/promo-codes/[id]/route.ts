import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyAdminHeader } from '../../_lib/auth';

export const dynamic = 'force-dynamic';

function getStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return null;
  return new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' as any });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminHeader(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 500 });

  const { id } = await params;
  let body: { active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  try {
    const promo = await stripe.promotionCodes.update(id, {
      active: Boolean(body.active),
    });
    return NextResponse.json({ id: promo.id, active: promo.active });
  } catch (error: any) {
    console.error('Erreur mise à jour code promo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminHeader(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 500 });

  const { id } = await params;

  try {
    // Stripe ne permet pas de vraiment supprimer un promotion code.
    // On le désactive ET on le marque comme "hidden" via metadata pour le filtrer de la liste.
    const promo = await stripe.promotionCodes.update(id, {
      active: false,
      metadata: { hidden: 'true' },
    });

    // On essaie aussi de supprimer le coupon associé pour nettoyer côté Stripe
    try {
      const couponRef = promo.promotion?.coupon;
      if (typeof couponRef === 'string') {
        await stripe.coupons.del(couponRef);
      } else if (couponRef && typeof couponRef === 'object' && couponRef.id) {
        await stripe.coupons.del(couponRef.id);
      }
    } catch {
      // Le coupon peut déjà être expiré ou utilisé, on ignore
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Erreur suppression code promo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
