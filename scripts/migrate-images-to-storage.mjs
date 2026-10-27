// Migre les photos base64 stockées dans Firestore (produits, variantes de couleur,
// logos de boutiques) vers Firebase Storage, puis remplace chaque base64 par l'URL
// de téléchargement du fichier. Rien d'autre dans les documents n'est modifié.
//
//   node --env-file=.env scripts/migrate-images-to-storage.mjs           → simulation
//   node --env-file=.env scripts/migrate-images-to-storage.mjs --apply   → migration
//
// Sans risque à relancer : le nom de fichier est dérivé du contenu de l'image, les
// fichiers déjà envoyés sont réutilisés et les champs déjà migrés sont ignorés.
import { createHash, randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const APPLY = process.argv.includes('--apply');

let privateKey = process.env.FIREBASE_PRIVATE_KEY.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
});
const db = getFirestore();
const bucket = getStorage().bucket(bucketName);
const base = db.collection('artifacts').doc(process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'default-app-id').collection('public').doc('data');

const isDataUrl = (v) => typeof v === 'string' && v.startsWith('data:');
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };

// Champs image de chaque collection : on ne touche qu'à ceux-là.
function imageFields(collection, data) {
  if (collection === 'retailers') return { logo: data.logo };
  const out = {};
  if (data.images !== undefined) out.images = data.images;
  if (data.image !== undefined) out.image = data.image;
  if (data.colorVariants !== undefined) out.colorVariants = data.colorVariants;
  return out;
}

// Remplace récursivement chaque base64 connu par son URL.
function replaceDeep(value, urls) {
  if (isDataUrl(value)) return urls.get(value) ?? value;
  if (Array.isArray(value)) return value.map((v) => replaceDeep(v, urls));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceDeep(v, urls)]));
  }
  return value;
}

function collectDataUrls(value, out = new Set()) {
  if (isDataUrl(value)) out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => collectDataUrls(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectDataUrls(v, out));
  return out;
}

async function upload(dataUrl, folder) {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (!match) throw new Error('Format base64 inattendu');
  const [, contentType, b64] = match;
  const bytes = Buffer.from(b64, 'base64');
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 20);
  const file = bucket.file(`${folder}/${hash}.${EXT[contentType] || 'bin'}`);

  let token;
  const [exists] = await file.exists();
  if (exists) {
    const [meta] = await file.getMetadata();
    token = meta.metadata?.firebaseStorageDownloadTokens?.split(',')[0];
  }
  if (!token) {
    token = randomUUID();
    await file.save(bytes, {
      resumable: false,
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
  }

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`;

  // Vérification : l'URL publique doit renvoyer exactement la même image.
  const res = await fetch(url);
  const served = Buffer.from(await res.arrayBuffer());
  if (!res.ok || !served.equals(bytes)) throw new Error(`Vérification échouée pour ${file.name} (HTTP ${res.status})`);
  return url;
}

async function migrateCollection(collection, folder) {
  const snap = await base.collection(collection).get();
  let uploaded = 0, docsUpdated = 0;

  for (const doc of snap.docs) {
    const dataUrls = [...collectDataUrls(imageFields(collection, doc.data()))];
    if (dataUrls.length === 0) continue;
    console.log(`${collection}/${doc.id} : ${dataUrls.length} image(s) base64`);
    if (!APPLY) continue;

    const urls = new Map();
    for (const d of dataUrls) {
      urls.set(d, await upload(d, `${folder}/${doc.id}`));
      uploaded++;
    }

    // Transaction : relit le document au moment d'écrire pour ne rien écraser
    // (ex. une baisse de stock arrivée pendant l'envoi des fichiers).
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      if (!fresh.exists) return;
      const fields = imageFields(collection, fresh.data());
      const updates = {};
      for (const [key, value] of Object.entries(fields)) {
        const next = replaceDeep(value, urls);
        if (JSON.stringify(next) !== JSON.stringify(value)) updates[key] = next;
      }
      if (Object.keys(updates).length > 0) tx.update(doc.ref, updates);
    });
    docsUpdated++;
    console.log(`  ✓ migré`);
  }
  return { uploaded, docsUpdated };
}

// Sauvegarde complète avant toute écriture.
if (APPLY) {
  mkdirSync('backups', { recursive: true });
  const backup = {};
  for (const c of ['inventory', 'retailers']) {
    backup[c] = Object.fromEntries((await base.collection(c).get()).docs.map((d) => [d.id, d.data()]));
  }
  const path = `backups/images-before-storage-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(path, JSON.stringify(backup));
  console.log(`Sauvegarde : ${path}\n`);
}

const inv = await migrateCollection('inventory', 'products');
const ret = await migrateCollection('retailers', 'retailers');
console.log(
  APPLY
    ? `\nTerminé : ${inv.uploaded + ret.uploaded} fichier(s) envoyés, ${inv.docsUpdated + ret.docsUpdated} document(s) mis à jour.`
    : '\nSimulation uniquement. Relancer avec --apply pour migrer.'
);
process.exit(0);
