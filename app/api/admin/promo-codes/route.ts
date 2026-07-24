import { NextResponse } from 'next/server';
import { verifyAdminHeader } from '../_lib/auth';
import { getAdminDb } from '../_lib/firebase';

export const dynamic = 'force-dynamic';

// Représentation d'un code promo telle que consommée par l'interface admin.
// (Même contrat qu'avant la migration Stripe → conservé pour ne rien casser côté UI.)
function formatPromo(id: string, p: any) {
  return {
    id,
    code: p.code,
    active: p.active !== false,
    percentOff: p.percentOff ?? null,
    amountOff: null,
    currency: null,
    duration: 'once',
    maxRedemptions: p.maxRedemptions ?? null,
    timesRedeemed: p.timesRedeemed ?? 0,
    expiresAt: p.expiresAt ?? null,
    createdAt: p.createdAt ?? null,
    couponId: null,
  };
}

export async function GET(request: Request) {
  if (!verifyAdminHeader(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection('promoCodes').get();
    const formatted = snap.docs
      .map((doc) => ({ id: doc.id, data: doc.data() }))
      .filter(({ data }) => data.hidden !== true)
      .map(({ id, data }) => formatPromo(id, data))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

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
  // Le code sert d'ID de document Firestore : caractères sûrs uniquement.
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return NextResponse.json({ error: 'Le code ne peut contenir que lettres, chiffres, tirets et soulignés.' }, { status: 400 });
  }
  if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
    return NextResponse.json({ error: 'Le pourcentage doit être entre 1 et 100.' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const ref = db.collection('promoCodes').doc(code);

    const existing = await ref.get();
    if (existing.exists && existing.data()?.hidden !== true) {
      return NextResponse.json({ error: 'Ce code existe déjà.' }, { status: 409 });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const data: any = {
      code,
      percentOff,
      active: true,
      hidden: false,
      timesRedeemed: 0,
      maxRedemptions:
        body.maxRedemptions && Number(body.maxRedemptions) > 0 ? Math.floor(Number(body.maxRedemptions)) : null,
      expiresAt: body.expiresAt && Number(body.expiresAt) > nowSec ? Math.floor(Number(body.expiresAt)) : null,
      createdAt: nowSec,
    };

    await ref.set(data);

    return NextResponse.json(formatPromo(code, data));
  } catch (error: any) {
    console.error('Erreur création code promo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
