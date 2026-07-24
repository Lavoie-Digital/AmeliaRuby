import { SquareClient, SquareEnvironment } from 'square';

/**
 * Client Square partagé (serveur uniquement).
 * En sandbox: SQUARE_ENVIRONMENT=sandbox + un access token sandbox (commence par "EAAA...").
 * En production: SQUARE_ENVIRONMENT=production + le token de production.
 */
let cachedClient: SquareClient | null = null;

export function getSquareClient(): SquareClient {
  if (cachedClient) return cachedClient;

  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    throw new Error('SQUARE_ACCESS_TOKEN manquant dans les variables d\'environnement.');
  }

  const environment =
    (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase() === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox;

  cachedClient = new SquareClient({ token, environment });
  return cachedClient;
}

/**
 * Résout l'ID de la « location » Square à utiliser.
 * Priorité: SQUARE_LOCATION_ID; sinon on récupère la première location active du compte.
 */
let cachedLocationId: string | null = null;

export async function getLocationId(): Promise<string> {
  if (process.env.SQUARE_LOCATION_ID) return process.env.SQUARE_LOCATION_ID;
  if (cachedLocationId) return cachedLocationId;

  const client = getSquareClient();
  const res = await client.locations.list();
  const location = res.locations?.find((l) => l.status === 'ACTIVE') || res.locations?.[0];
  if (!location?.id) {
    throw new Error('Aucune location Square trouvée sur le compte.');
  }
  cachedLocationId = location.id;
  return cachedLocationId;
}

/**
 * Taxes de vente canadiennes par province (taux combinés 2026).
 * Reproduit le comportement de « Stripe Tax » : on perçoit la taxe sur les
 * commandes canadiennes selon la province de livraison, 0 % ailleurs.
 *
 * ⚠️ À valider avec la comptable de la cliente selon les provinces où
 * l'entreprise est réellement inscrite. Les taux ci-dessous sont facilement
 * modifiables.
 */
const CANADA_TAX_RATES: Record<string, number> = {
  AB: 5,        // TPS seulement
  BC: 12,       // TPS 5 + PST 7
  MB: 12,       // TPS 5 + PST 7
  NB: 15,       // TVH
  NL: 15,       // TVH
  NS: 14,       // TVH (14 % depuis avr. 2025)
  NT: 5,        // TPS seulement
  NU: 5,        // TPS seulement
  ON: 13,       // TVH
  PE: 15,       // TVH
  QC: 14.975,   // TPS 5 + TVQ 9,975
  SK: 11,       // TPS 5 + PST 6
  YT: 5,        // TPS seulement
};

// Noms de provinces (fr/en) → code, au cas où l'adresse contient un nom complet.
const PROVINCE_NAME_TO_CODE: Record<string, string> = {
  ALBERTA: 'AB',
  'BRITISH COLUMBIA': 'BC',
  'COLOMBIE-BRITANNIQUE': 'BC',
  MANITOBA: 'MB',
  'NEW BRUNSWICK': 'NB',
  'NOUVEAU-BRUNSWICK': 'NB',
  'NEWFOUNDLAND AND LABRADOR': 'NL',
  'TERRE-NEUVE-ET-LABRADOR': 'NL',
  'NOVA SCOTIA': 'NS',
  'NOUVELLE-ECOSSE': 'NS',
  'NORTHWEST TERRITORIES': 'NT',
  'TERRITOIRES DU NORD-OUEST': 'NT',
  NUNAVUT: 'NU',
  ONTARIO: 'ON',
  'PRINCE EDWARD ISLAND': 'PE',
  'ILE-DU-PRINCE-EDOUARD': 'PE',
  QUEBEC: 'QC',
  'QUÉBEC': 'QC',
  SASKATCHEWAN: 'SK',
  YUKON: 'YT',
};

function normalizeProvince(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim().toUpperCase();
  if (CANADA_TAX_RATES[raw]) return raw;
  const stripped = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (CANADA_TAX_RATES[stripped]) return stripped;
  return PROVINCE_NAME_TO_CODE[raw] || PROVINCE_NAME_TO_CODE[stripped] || null;
}

/**
 * Retourne le taux de taxe (%) applicable à une adresse de livraison.
 * 0 % si le pays n'est pas le Canada ou si la province est inconnue.
 */
export function getTaxRate(country?: string | null, province?: string | null): number {
  const c = (country || '').trim().toUpperCase();
  if (c && c !== 'CA' && c !== 'CAN' && c !== 'CANADA') return 0;
  const code = normalizeProvince(province);
  if (!code) return 0;
  return CANADA_TAX_RATES[code] ?? 0;
}

/** Formate un taux en chaîne acceptée par Square (ex. 14.975 → "14.975"). */
export function taxPercentageString(rate: number): string {
  return String(rate);
}
