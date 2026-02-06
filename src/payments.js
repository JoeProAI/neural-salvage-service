// src/payments.js: Multi-currency payment processing
// Accepts: USD (Stripe), SOL, AR, ETH, USDC, BTC
const { upgradeTier } = require('./auth');

// Pricing in USD equivalent
const TIER_PRICES = {
  pro: 5,        // $5/month
  enterprise: 25 // $25/month
};

// Accepted payment wallets/addresses
const PAYMENT_ADDRESSES = {
  SOL: process.env.SOL_WALLET || null,
  AR: process.env.AR_WALLET || null,
  ETH: process.env.ETH_WALLET || null,
  USDC: process.env.USDC_WALLET || null,  // On Solana or Ethereum
  BTC: process.env.BTC_WALLET || null
};

/**
 * Get available payment methods
 */
function getPaymentMethods() {
  const methods = [];

  // Stripe (USD)
  if (process.env.STRIPE_SECRET_KEY) {
    methods.push({
      currency: 'USD',
      method: 'stripe',
      description: 'Credit/debit card via Stripe'
    });
  }

  // Crypto
  for (const [currency, address] of Object.entries(PAYMENT_ADDRESSES)) {
    if (address) {
      methods.push({
        currency,
        method: 'crypto',
        address: address,
        description: `Send ${currency} directly`
      });
    }
  }

  // If nothing configured
  if (methods.length === 0) {
    methods.push({
      currency: 'none',
      method: 'demo',
      description: 'Payments not configured — all accounts have free tier'
    });
  }

  return {
    methods,
    tiers: {
      free: { price: 0, salvages_per_month: 1, max_size: '1MB' },
      pro: { price: TIER_PRICES.pro, salvages_per_month: 'unlimited', max_size: '100MB' },
      enterprise: { price: TIER_PRICES.enterprise, salvages_per_month: 'unlimited', max_size: 'unlimited' }
    }
  };
}

/**
 * Create a payment intent
 */
async function createPayment({ accountId, currency, tier }) {
  const price = TIER_PRICES[tier];
  if (!price) throw new Error(`Unknown tier: ${tier}`);

  currency = currency.toUpperCase();

  // Stripe (USD)
  if (currency === 'USD') {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe not configured');
    }
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Neural Salvage ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
            description: `${tier === 'pro' ? 'Unlimited salvages, 100MB max' : 'Unlimited everything'} — monthly`
          },
          unit_amount: price * 100, // cents
          recurring: { interval: 'month' }
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.BASE_URL || 'http://localhost:3000'}/ui/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL || 'http://localhost:3000'}/ui/payment-cancel`,
      metadata: { accountId, tier }
    });

    return {
      type: 'stripe_checkout',
      checkout_url: session.url,
      session_id: session.id,
      amount: price,
      currency: 'USD'
    };
  }

  // Crypto payments
  const address = PAYMENT_ADDRESSES[currency];
  if (!address) {
    throw new Error(`${currency} payments not configured. Available: ${Object.keys(PAYMENT_ADDRESSES).filter(k => PAYMENT_ADDRESSES[k]).join(', ')}`);
  }

  // For crypto we return payment instructions
  // Verification happens async via /payments/verify
  const paymentId = `pay_${Date.now()}_${accountId.slice(0, 8)}`;
  
  return {
    type: 'crypto',
    payment_id: paymentId,
    currency,
    amount_usd: price,
    send_to: address,
    instructions: `Send $${price} equivalent of ${currency} to ${address}. Then call POST /api/v1/payments/verify with { payment_id: "${paymentId}", tx_signature: "<your tx hash>" }`,
    note: 'After verification, your account will be upgraded automatically.'
  };
}

/**
 * Verify a crypto payment (basic — checks tx exists, amount TBD)
 * In production: use chain-specific verification (Solana RPC, Etherscan, etc.)
 */
async function verifyPayment({ paymentId, txSignature }) {
  // Extract currency from payment context
  // For now: manual verification flag
  // TODO: Implement chain-specific verification:
  // - SOL/USDC: Use @solana/web3.js to check transfer
  // - ETH: Use ethers.js to check transfer
  // - AR: Use Arweave SDK
  // - BTC: Use blockstream API
  
  console.log(`[Payment] Verification request: ${paymentId} | TX: ${txSignature}`);

  return {
    payment_id: paymentId,
    tx_signature: txSignature,
    status: 'pending_review',
    message: 'Payment recorded. Manual verification in progress — your account will be upgraded within 24 hours.',
    note: 'Automated on-chain verification coming soon.'
  };
}

/**
 * Stripe webhook handler (call from server.js route)
 */
async function handleStripeWebhook(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { accountId, tier } = session.metadata;
    
    if (accountId && tier) {
      await upgradeTier(accountId, tier);
      console.log(`[Payment] Stripe upgrade: ${accountId} → ${tier}`);
    }
  }
}

module.exports = { getPaymentMethods, createPayment, verifyPayment, handleStripeWebhook };
