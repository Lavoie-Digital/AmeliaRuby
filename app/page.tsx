import Shop from './_components/Shop';
import { getAdminDb, inventoryCollection } from './api/admin/_lib/firebase';

// Catalogue lu côté serveur à chaque visite (Firestore ne contient plus que des
// URLs d'images : la lecture est légère). Les produits sont donc dans le HTML dès
// le premier affichage : aucun chargement. Pas d'ISR : sur Firebase App Hosting,
// la page d'accueil en ISR était servie en 404.
export const dynamic = 'force-dynamic';

async function getInitialProducts(): Promise<any[] | null> {
  try {
    const snap = await inventoryCollection(getAdminDb()).get();
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    // Garantit des props sérialisables pour le composant client.
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error('Erreur pré-chargement produits:', error);
    return null;
  }
}

export default async function Page() {
  const initialProducts = await getInitialProducts();
  return <Shop initialProducts={initialProducts} />;
}
