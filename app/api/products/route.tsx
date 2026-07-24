import { NextResponse } from 'next/server';
import { getAdminDb, inventoryCollection } from '../admin/_lib/firebase';

// Désactive la mise en cache pour toujours afficher le bon stock.
export const dynamic = 'force-dynamic';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop';

/**
 * Catalogue produits — source de vérité : Firestore (collection `inventory`).
 * (Auparavant lu depuis Stripe; la boutique lit déjà Firestore en temps réel,
 * cette route reste disponible pour un usage serveur/externe.)
 */
export async function GET() {
  try {
    const db = getAdminDb();
    const snap = await inventoryCollection(db).get();

    const products = snap.docs.map((doc) => {
      const p = doc.data() as any;
      const price = Number(p.price) || 0;
      const images: string[] = Array.isArray(p.images) && p.images.length > 0 ? p.images : [];
      return {
        id: doc.id,
        name: p.name || '',
        description: p.description || '',
        price,
        displayPrice: price ? `${price} $` : 'Prix sur demande',
        image: images[0] || p.image || FALLBACK_IMAGE,
        images: images.length > 0 ? images : [p.image || FALLBACK_IMAGE],
        category: p.category || 'Collection Privée',
        tag: p.tag || '',
        stockQuantity: p.stockQuantity ?? null,
      };
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Erreur récupération produits:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
