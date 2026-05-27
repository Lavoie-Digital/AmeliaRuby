import { NextResponse } from 'next/server';
import { verifyAdminHeader } from '../../_lib/auth';
import { getAdminDb, inventoryCollection } from '../../_lib/firebase';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminHeader(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const { id } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  // Nettoyer les champs qui ne doivent pas être réécrits
  const { id: _ignoredId, ...updates } = body;

  try {
    const db = getAdminDb();
    await inventoryCollection(db).doc(id).update(updates);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Erreur mise à jour produit:', error);
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
    await inventoryCollection(db).doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Erreur suppression produit:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
