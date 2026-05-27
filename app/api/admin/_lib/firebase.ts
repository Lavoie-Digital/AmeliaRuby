import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let cachedDb: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (cachedDb) return cachedDb;

  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Variables Firebase Admin manquantes (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).');
    }

    let formattedKey = privateKey.trim();
    if (
      (formattedKey.startsWith('"') && formattedKey.endsWith('"')) ||
      (formattedKey.startsWith("'") && formattedKey.endsWith("'"))
    ) {
      formattedKey = formattedKey.slice(1, -1);
    }
    formattedKey = formattedKey.replace(/\\n/g, '\n');
    if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----\n')) {
      formattedKey = formattedKey.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
    }
    if (!formattedKey.includes('\n-----END PRIVATE KEY-----')) {
      formattedKey = formattedKey.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
    }

    initializeApp({ credential: cert({ projectId, clientEmail, privateKey: formattedKey }) });
  }

  cachedDb = getFirestore();
  return cachedDb;
}

export function getAppId(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'default-app-id';
}

export function inventoryCollection(db: Firestore) {
  return db.collection('artifacts').doc(getAppId()).collection('public').doc('data').collection('inventory');
}

export function trackingsCollection(db: Firestore) {
  return db.collection('artifacts').doc(getAppId()).collection('public').doc('data').collection('trackings');
}
