import { createHash, randomUUID } from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { getAdminDb } from './firebase';

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg',
};

/**
 * Envoie une image (data URL base64, déjà compressée dans le navigateur) dans
 * Firebase Storage et retourne son URL publique de téléchargement.
 * Le nom du fichier dérive de son contenu : un fichier n'est jamais modifié,
 * on peut donc le mettre en cache indéfiniment.
 */
export async function uploadDataUrl(dataUrl: string, folder: string): Promise<string> {
  const match = dataUrl.match(/^data:(image\/[a-z+.-]+);base64,([\s\S]*)$/);
  if (!match || !EXT[match[1]]) throw new Error("Format d'image non pris en charge.");
  const [, contentType, b64] = match;
  const bytes = Buffer.from(b64, 'base64');

  getAdminDb(); // initialise l'app Firebase Admin si nécessaire
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const bucket = getStorage().bucket(
    process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`
  );
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 20);
  const file = bucket.file(`${folder}/${hash}.${EXT[contentType]}`);
  const token = randomUUID();

  await file.save(bytes, {
    resumable: false,
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=${token}`;
}
