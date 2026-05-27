import { NextResponse } from 'next/server';
import { verifyAdminHeader } from '../_lib/auth';
import { getAdminDb } from '../_lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!verifyAdminHeader(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snapshot = await db.collection('clients').get();
    const clients = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(clients);
  } catch (error: any) {
    console.error('Erreur récupération commandes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
