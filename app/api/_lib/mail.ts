/**
 * Adresses d'envoi centralisées (SendGrid).
 *
 * Deux expéditeurs distincts, volontairement :
 *
 * - BRAND_EMAIL (info@) sert aux courriels destinés aux CLIENTS. C'est une vraie
 *   boîte, donc une réponse du client arrive bien quelque part.
 *
 * - SYSTEM_FROM_EMAIL (noreply@) sert aux notifications INTERNES envoyées à la
 *   propriétaire. Indispensable : quand l'expéditeur et le destinataire sont la
 *   même adresse, Gmail et Outlook replient le message dans la conversation
 *   « Envoyés » ou le sortent de la boîte de réception — d'où des commandes qui
 *   passent inaperçues. Avec un expéditeur différent, la notification arrive
 *   comme un courriel entrant normal (et peut être filtrée / notifiée).
 *
 * ⚠️ noreply@ameliaruby.com doit être couvert par l'authentification de domaine
 * SendGrid (Settings → Sender Authentication → Domain Authentication sur
 * ameliaruby.com). Une simple « Single Sender Verification » de info@ ne suffit
 * pas : SendGrid refuserait l'envoi avec une erreur 403 « does not match a
 * verified Sender Identity ».
 */

/** Adresse publique de la maison — expéditeur des courriels aux clients. */
export const BRAND_EMAIL = process.env.BRAND_EMAIL || 'info@ameliaruby.com';

/** Expéditeur technique des notifications internes (ne reçoit pas de réponses). */
export const SYSTEM_FROM_EMAIL =
  process.env.NOTIFICATION_FROM_EMAIL || 'noreply@ameliaruby.com';

/** Boîte de la propriétaire qui reçoit les notifications internes. */
export const OWNER_EMAIL = process.env.ORDER_NOTIFICATION_EMAIL || BRAND_EMAIL;
