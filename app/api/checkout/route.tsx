import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      console.error("ERREUR: STRIPE_SECRET_KEY manquante sur le serveur.");
      return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2026-03-25.dahlia' as any, // Assure-toi d'utiliser la même version que dans ton webhook
    });

    const body = await request.json();
    const { items } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Le panier est vide." }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Création d'une description claire pour le tableau de bord Stripe de la cliente
    const orderDescription = items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ');

    // Création des articles formatés pour Stripe "à la volée"
    const line_items = items.map((item: any) => ({
      price_data: {
        currency: 'cad', // Devise en dollars canadiens
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded_page' as any,
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',

      // Permet à la cliente d'utiliser des codes promo créés dans l'admin
      allow_promotion_codes: true,
      
      // NOUVEAU: Ajoute le nom du produit directement dans la liste des paiements Stripe !
      payment_intent_data: {
        description: `Commande: ${orderDescription}`,
        metadata: {
          produits: orderDescription
        }
      },

      // 👇 LA CORRECTION CRUCIALE EST ICI 👇
      // On ajoute cartItems en format JSON (chaîne de caractères) pour que le webhook
      // puisse récupérer les IDs des produits et décrémenter le stock de l'inventaire.
      metadata: {
        produits: orderDescription,
        cartItems: JSON.stringify(items.map((i: any) => ({ id: i.id, quantity: i.quantity })))
      },
      // 👆 👆 👆
      
      // Demander l'adresse de livraison
      shipping_address_collection: {
        allowed_countries: ['CA', 'US', 'FR', 'BE', 'CH'], 
      },
      
      // Demander le numéro de téléphone (très utile pour FedEx, UPS, etc.)
      phone_number_collection: {
        enabled: true,
      },

      // Créer automatiquement une facture professionnelle PDF
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Merci pour votre commande chez Maison Amélia Ruby. Détails : ${orderDescription}`,
        }
      },
      
      return_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    return NextResponse.json({ clientSecret: session.client_secret });

  } catch (error: any) {
    console.error("Erreur Stripe:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}