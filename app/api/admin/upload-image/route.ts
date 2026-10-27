import { NextResponse } from 'next/server';
import { verifyAdminHeader } from '../_lib/auth';
import { uploadDataUrl } from '../_lib/storage';

export const dynamic = 'force-dynamic';

const FOLDERS = new Set(['products', 'retailers']);

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

  const folder = FOLDERS.has(body?.folder) ? body.folder : 'products';
  if (typeof body?.dataUrl !== 'string') {
    return NextResponse.json({ error: 'Image manquante.' }, { status: 400 });
  }

  try {
    const url = await uploadDataUrl(body.dataUrl, folder);
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Erreur envoi image:', error);
    return NextResponse.json({ error: error.message || "Impossible d'envoyer l'image." }, { status: 500 });
  }
}
