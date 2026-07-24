import { NextResponse } from 'next/server';
import { verifyAdminHeader } from '../../_lib/auth';
import { getAdminDb } from '../../_lib/firebase';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminHeader(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const { id } = await params;
  let body: { active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const ref = db.collection('promoCodes').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Code introuvable.' }, { status: 404 });
    }
    await ref.update({ active: Boolean(body.active) });
    return NextResponse.json({ id, active: Boolean(body.active) });
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

  const { id } = await params;

  try {
    const db = getAdminDb();
    // On marque le code comme masqué + inactif (conserve l'historique d'utilisation).
    await db.collection('promoCodes').doc(id).set(
      { active: false, hidden: true },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Erreur suppression code promo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
