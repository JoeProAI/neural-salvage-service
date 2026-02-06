require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Core modules
const { salvageToArweave, retrieveSalvage, listSalvages } = require('./src/salvage');
const { reviveFromSalvage } = require('./src/revival');
const { createAccount, authenticate, getAccount, rotateKey } = require('./src/auth');
const { createPayment, verifyPayment, getPaymentMethods } = require('./src/payments');
const { validateSoulPayload } = require('./src/schema');

const app = express();

// Security & parsing
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Static UI
app.use('/ui', express.static(path.join(__dirname, 'ui')));

// ============================================================
// MIDDLEWARE
// ============================================================

// API key auth middleware
async function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (!key) return res.status(401).json({ error: 'Missing API key', hint: 'Set Authorization: Bearer <your-api-key>' });
  
  try {
    const account = await authenticate(key);
    if (!account) return res.status(401).json({ error: 'Invalid API key' });
    req.account = account;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Auth failed', message: err.message });
  }
}

// Optional auth (enriches request if key present)
async function optionalAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key) {
    try { req.account = await authenticate(key); } catch {}
  }
  next();
}

// ============================================================
// PUBLIC - No auth required
// ============================================================

app.get('/health', (req, res) => res.json({ 
  status: 'ok',
  service: 'neural-salvage',
  version: '0.1.0',
  timestamp: new Date().toISOString()
}));

// Service info + accepted payment methods
app.get('/api/v1/info', (req, res) => res.json({
  service: 'Neural Salvage',
  version: '0.1.0',
  description: 'Permanent AI state preservation on Arweave',
  docs: 'https://neuralsalvage.com/docs',
  payments: getPaymentMethods(),
  limits: {
    free: { salvages_per_month: 1, max_size_bytes: 1_048_576 },   // 1MB
    pro:  { salvages_per_month: -1, max_size_bytes: 104_857_600 }, // 100MB
    enterprise: { salvages_per_month: -1, max_size_bytes: -1 }
  }
}));

// ============================================================
// ACCOUNTS - Self-registration for agents and humans
// ============================================================

// Register (agent or human)
app.post('/api/v1/register', async (req, res) => {
  try {
    const { name, type, description, metadata } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!type || !['agent', 'human'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "agent" or "human"' });
    }

    const account = await createAccount({ name, type, description, metadata });
    
    res.status(201).json({
      success: true,
      account: {
        id: account.id,
        name: account.name,
        type: account.type,
        api_key: account.apiKey,
        tier: account.tier,
        created_at: account.createdAt
      },
      important: '⚠️ SAVE YOUR API KEY! It cannot be recovered.'
    });
  } catch (err) {
    if (err.message.includes('already exists')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get own account info
app.get('/api/v1/account', requireAuth, (req, res) => {
  const a = req.account;
  res.json({
    success: true,
    account: {
      id: a.id,
      name: a.name,
      type: a.type,
      tier: a.tier,
      salvage_count: a.salvageCount,
      total_bytes: a.totalBytes,
      created_at: a.createdAt,
      last_salvage: a.lastSalvage
    }
  });
});

// Rotate API key
app.post('/api/v1/account/rotate-key', requireAuth, async (req, res) => {
  try {
    const newKey = await rotateKey(req.account.id);
    res.json({ 
      success: true, 
      api_key: newKey,
      important: '⚠️ Your old key is now invalid. Save this one!'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// SALVAGE - The core product
// ============================================================

// Save soul to Arweave
app.post('/api/v1/salvage', requireAuth, async (req, res) => {
  try {
    const { soul, metadata } = req.body;
    
    // Validate soul payload
    const validation = validateSoulPayload(soul);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid soul payload', details: validation.errors });
    }

    // Check tier limits
    const account = req.account;
    const payloadSize = Buffer.byteLength(JSON.stringify(soul));
    
    if (account.tier === 'free') {
      if (account.salvageCount >= 1 && !isNewMonth(account.lastSalvage)) {
        return res.status(429).json({ 
          error: 'Free tier limit reached (1 salvage/month)',
          hint: 'Upgrade to Pro for unlimited salvages',
          upgrade_url: '/api/v1/payments/create'
        });
      }
      if (payloadSize > 1_048_576) {
        return res.status(413).json({ error: 'Payload too large for free tier (max 1MB)' });
      }
    }

    const result = await salvageToArweave({
      soul,
      account: { id: account.id, name: account.name, type: account.type },
      metadata: { ...metadata, payloadSize }
    });

    res.status(201).json({
      success: true,
      salvage: {
        tx_id: result.txId,
        status: result.status,
        arweave_url: `https://arweave.net/${result.txId}`,
        size_bytes: payloadSize,
        account: account.name,
        timestamp: new Date().toISOString()
      },
      message: result.status === 'demo' 
        ? 'Demo mode — soul echoed but not yet written to Arweave'
        : 'Soul salvaged permanently to Arweave. This cannot be undone.'
    });
  } catch (err) {
    console.error('[Salvage] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Retrieve a salvaged soul
app.get('/api/v1/salvage/:txId', optionalAuth, async (req, res) => {
  try {
    const result = await retrieveSalvage(req.params.txId);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: 'Salvage not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

// List own salvages
app.get('/api/v1/salvages', requireAuth, async (req, res) => {
  try {
    const { limit = 25, offset = 0 } = req.query;
    const salvages = await listSalvages(req.account.id, { limit: +limit, offset: +offset });
    res.json({ success: true, ...salvages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// REVIVE - Restore from Arweave
// ============================================================

// Revive a soul (returns structured state ready for agent bootstrap)
app.post('/api/v1/revive', optionalAuth, async (req, res) => {
  try {
    const { tx_id, format } = req.body;
    if (!tx_id) return res.status(400).json({ error: 'Missing tx_id' });

    const result = await reviveFromSalvage(tx_id, { format: format || 'structured' });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PAYMENTS - Multi-currency
// ============================================================

// Get payment options
app.get('/api/v1/payments/methods', (req, res) => {
  res.json({ success: true, methods: getPaymentMethods() });
});

// Create payment intent (Stripe for USD, or crypto instructions)
app.post('/api/v1/payments/create', requireAuth, async (req, res) => {
  try {
    const { currency, tier } = req.body;
    if (!currency) return res.status(400).json({ error: 'Missing currency' });
    if (!tier || !['pro', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Tier must be "pro" or "enterprise"' });
    }

    const payment = await createPayment({ 
      accountId: req.account.id, 
      currency, 
      tier 
    });
    
    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify crypto payment
app.post('/api/v1/payments/verify', requireAuth, async (req, res) => {
  try {
    const { payment_id, tx_signature } = req.body;
    if (!payment_id || !tx_signature) {
      return res.status(400).json({ error: 'Missing payment_id or tx_signature' });
    }

    const result = await verifyPayment({ paymentId: payment_id, txSignature: tx_signature });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// UTILITIES
// ============================================================

function isNewMonth(lastDate) {
  if (!lastDate) return true;
  const last = new Date(lastDate);
  const now = new Date();
  return last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear();
}

// Landing page
app.get('/', (req, res) => {
  res.redirect('/ui');
});

// ============================================================
// START
// ============================================================

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════╗
║          NEURAL SALVAGE SERVICE           ║
╠═══════════════════════════════════════════╣
║  Port: ${port}                                ║
║  Arweave: ${process.env.ARWEAVE_WALLET_JSON ? 'Connected' : 'Demo mode'}                      ║
║  Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Connected' : 'Not configured'}                     ║
║  Solana: ${process.env.SOLANA_RPC_URL ? 'Custom RPC' : 'Mainnet default'}                    ║
║                                           ║
║  Docs: /api/v1/info                       ║
╚═══════════════════════════════════════════╝
  `);
});

module.exports = app;
