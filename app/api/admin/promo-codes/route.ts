import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyAdminHeader } from '../_lib/auth';

export const dynamic = 'force-dynamic';

function getStripe() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return null;
  return new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' as any });
}

export async function GET(request: Request) {
  if (!verifyAdminHeader(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 500 });

  try {
    const promoCodes = await stripe.promotionCodes.list({
      limit: 100,
      expand: ['data.promotion.coupon'],
    });

    const formatted = promoCodes.data
      .filter((promo) => promo.metadata?.hidden !== 'true')
      .map((promo) => {
      const coupon = (promo.promotion?.coupon && typeof promo.promotion.coupon !== 'string')
        ? promo.promotion.coupon as Stripe.Coupon
        : null;
      return {
        id: promo.id,
        code: promo.code,
        active: promo.active,
        percentOff: coupon?.percent_off ?? null,
        amountOff: coupon?.amount_off ? coupon.amount_off / 100 : null,
        currency: coupon?.currency ?? null,
        duration: coupon?.duration ?? null,
        maxRedemptions: promo.max_redemptions,
        timesRedeemed: promo.times_redeemed,
        expiresAt: promo.expires_at,
        createdAt: promo.created,
        couponId: coupon?.id ?? null,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Erreur récupération codes promo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifyAdminHeader(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'Configuration serveur incomplète.' }, { status: 500 });

  let body: {
    code?: string;
    percentOff?: number;
    maxRedemptions?: number | null;
    expiresAt?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const code = (body.code || '').trim().toUpperCase();
  const percentOff = Number(body.percentOff);

  if (!code || code.length < 3) {
    return NextResponse.json({ error: 'Le code doit contenir au moins 3 caractères.' }, { status: 400 });
  }
  if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
    return NextResponse.json({ error: 'Le pourcentage doit être entre 1 et 100.' }, { status: 400 });
  }

  try {
    const coupon = await stripe.coupons.create({
      percent_off: percentOff,
      duration: 'once',
      name: code,
    });

    const promotionCodeParams: Stripe.PromotionCodeCreateParams = {
      promotion: { type: 'coupon', coupon: coupon.id },
      code,
    };

    if (body.maxRedemptions && Number(body.maxRedemptions) > 0) {
      promotionCodeParams.max_redemptions = Math.floor(Number(body.maxRedemptions));
    }
    if (body.expiresAt && Number(body.expiresAt) > Math.floor(Date.now() / 1000)) {
      promotionCodeParams.expires_at = Math.floor(Number(body.expiresAt));
    }

    const promo = await stripe.promotionCodes.create(promotionCodeParams);

    return NextResponse.json({
      id: promo.id,
      code: promo.code,
      active: promo.active,
      percentOff: coupon.percent_off,
      maxRedemptions: promo.max_redemptions,
      timesRedeemed: promo.times_redeemed,
      expiresAt: promo.expires_at,
      couponId: coupon.id,
    });
  } catch (error: any) {
    console.error('Erreur création code promo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
