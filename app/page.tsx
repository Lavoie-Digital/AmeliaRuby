import Shop from './_components/Shop';
import { getAdminDb, inventoryCollection } from './api/admin/_lib/firebase';

// Catalogue pré-rendu côté serveur et régénéré au plus toutes les 60 s
// (et immédiatement après chaque modification dans l'admin via revalidatePath).
// Les produits sont donc dans le HTML dès le premier affichage : aucun chargement.
export const revalidate = 60;

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
