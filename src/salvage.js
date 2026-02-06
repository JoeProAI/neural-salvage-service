// src/salvage.js: Core salvage operations — write and read from Arweave
const Arweave = require('arweave');
const { recordSalvage } = require('./auth');

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

/**
 * Salvage (upload) a soul to Arweave
 * Tags the transaction for discoverability via GraphQL
 */
async function salvageToArweave({ soul, account, metadata }) {
  const walletJson = process.env.ARWEAVE_WALLET_JSON;

  const payload = {
    version: '1.0',
    schema: 'neural-salvage-soul',
    timestamp: new Date().toISOString(),
    soul,
    account: {
      id: account.id,
      name: account.name,
      type: account.type
    },
    metadata: metadata || {}
  };

  const data = JSON.stringify(payload);

  if (!walletJson) {
    // Demo mode — return a mock but log intent
    console.log(`[Salvage] Demo mode | Account: ${account.name} | Size: ${data.length} bytes`);
    
    // Still record it in the account
    const demoTxId = `demo-${Date.now()}-${account.id.slice(0, 8)}`;
    await recordSalvage(account.id, demoTxId, data.length);

    return {
      txId: demoTxId,
      status: 'demo',
      message: 'Demo mode — configure ARWEAVE_WALLET_JSON for permanent storage',
      size: data.length
    };
  }

  try {
    const wallet = JSON.parse(walletJson);
    
    // Create transaction
    const tx = await arweave.createTransaction({ data }, wallet);
    
    // Tag for discoverability
    tx.addTag('Content-Type', 'application/json');
    tx.addTag('App-Name', 'Neural-Salvage');
    tx.addTag('App-Version', '1.0');
    tx.addTag('Schema', 'neural-salvage-soul');
    tx.addTag('Agent-Name', soul.identity?.name || 'unknown');
    tx.addTag('Account-Id', account.id);
    tx.addTag('Account-Type', account.type);
    tx.addTag('Timestamp', payload.timestamp);
    
    if (soul.identity?.platform) {
      tx.addTag('Platform', soul.identity.platform);
    }

    // Sign and submit
    await arweave.transactions.sign(tx, wallet);
    const response = await arweave.transactions.post(tx);

    if (response.status !== 200) {
      throw new Error(`Arweave upload failed with status ${response.status}`);
    }

    // Record in account
    await recordSalvage(account.id, tx.id, data.length);

    console.log(`[Salvage] Permanent | Account: ${account.name} | TX: ${tx.id} | Size: ${data.length} bytes`);

    return {
      txId: tx.id,
      status: 'permanent',
      arweave_url: `https://arweave.net/${tx.id}`,
      size: data.length,
      cost_winston: tx.reward
    };
  } catch (err) {
    console.error('[Salvage] Arweave error:', err);
    throw new Error(`Arweave upload failed: ${err.message}`);
  }
}

/**
 * Retrieve a salvaged soul from Arweave
 */
async function retrieveSalvage(txId) {
  if (txId.startsWith('demo-')) {
    return {
      status: 'demo',
      message: 'This is a demo salvage — no data was written to Arweave',
      tx_id: txId
    };
  }

  try {
    const data = await arweave.transactions.getData(txId, { decode: true, string: true });
    const payload = JSON.parse(data);

    // Get transaction metadata
    const tx = await arweave.transactions.get(txId);
    const tags = {};
    tx.get('tags').forEach(tag => {
      const key = tag.get('name', { decode: true, string: true });
      const value = tag.get('value', { decode: true, string: true });
      tags[key] = value;
    });

    return {
      status: 'found',
      tx_id: txId,
      arweave_url: `https://arweave.net/${txId}`,
      tags,
      payload
    };
  } catch (err) {
    if (err.type === 'TX_NOT_FOUND' || err.message?.includes('not found')) {
      throw new Error(`Salvage not found: ${txId}`);
    }
    throw err;
  }
}

/**
 * List salvages for an account (from local db — Arweave GraphQL backup)
 */
async function listSalvages(accountId, { limit = 25, offset = 0 } = {}) {
  const { getAccount } = require('./auth');
  const account = await getAccount(accountId);
  if (!account) throw new Error('Account not found');

  const txIds = account.salvageTxIds || [];
  const total = txIds.length;
  const page = txIds.slice(offset, offset + limit).reverse(); // newest first

  return {
    salvages: page.map(txId => ({
      tx_id: txId,
      arweave_url: txId.startsWith('demo-') ? null : `https://arweave.net/${txId}`,
      is_demo: txId.startsWith('demo-')
    })),
    total,
    limit,
    offset
  };
}

module.exports = { salvageToArweave, retrieveSalvage, listSalvages };
