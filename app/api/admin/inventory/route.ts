import { NextResponse } from 'next/server';
import { verifyAdminHeader } from '../_lib/auth';
import { getAdminDb, inventoryCollection } from '../_lib/firebase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!verifyAdminHeader(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const ref = await inventoryCollection(db).add({
      ...body,
      createdAt: Date.now(),
    });
    return NextResponse.json({ id: ref.id });
  } catch (error: any) {
    console.error('Erreur création produit:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
