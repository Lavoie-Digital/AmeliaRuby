import { NextResponse } from 'next/server';
import { verifyAdminHeader } from '../_lib/auth';
import { getAdminDb, retailersCollection } from '../_lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!verifyAdminHeader(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snapshot = await retailersCollection(db).orderBy('order', 'asc').get();
    const retailers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ retailers });
  } catch (error: any) {
    console.error('Erreur lecture boutiques:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

  if (!body?.name || !String(body.name).trim()) {
    return NextResponse.json({ error: 'Le nom de la boutique est requis.' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const ref = await retailersCollection(db).add({
      name: String(body.name).trim(),
      logo: body.logo || '',
      url: body.url || '',
      order: typeof body.order === 'number' ? body.order : Date.now(),
      createdAt: Date.now(),
    });
    return NextResponse.json({ id: ref.id });
  } catch (error: any) {
    console.error('Erreur création boutique:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
