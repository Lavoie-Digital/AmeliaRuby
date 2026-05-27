import { NextResponse } from 'next/server';
import { verifyAdminHeader } from '../_lib/auth';
import { getAdminDb, trackingsCollection } from '../_lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!verifyAdminHeader(request)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snapshot = await trackingsCollection(db).get();
    const trackings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(trackings);
  } catch (error: any) {
    console.error('Erreur récupération trackings:', error);
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

  const {
    commandeId,
    trackingNumber,
    email,
    nom,
    produits,
    transporteur,
  } = body || {};

  if (!commandeId || !trackingNumber) {
    return NextResponse.json({ error: 'commandeId et trackingNumber requis.' }, { status: 400 });
  }

  try {
    const db = getAdminDb();

    // 1. Ajouter à l'historique trackings
    const trackingDoc = {
      commandeId,
      trackingNumber,
      email: email || '',
      nom: nom || '',
      produits: produits || '',
      transporteur: transporteur || '',
      date: new Date().toISOString(),
    };
    await trackingsCollection(db).add(trackingDoc);

    // 2. Mettre à jour le statut de la commande
    await db.collection('clients').doc(commandeId).update({
      statut: 'Expédié',
      trackingNumber,
      dateExpedition: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Erreur création tracking:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
