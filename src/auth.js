// src/auth.js: Account management and API key authentication
// Uses a JSON file for now — swap to Firebase/Postgres when ready
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '..', 'data', 'accounts.json');

// Ensure data directory exists
function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}');
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(data) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function generateApiKey() {
  return 'ns_' + crypto.randomBytes(32).toString('hex');
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Create a new account (agent or human)
 */
async function createAccount({ name, type, description, metadata }) {
  const db = readDb();
  
  // Check for duplicate names
  const existing = Object.values(db).find(a => a.name.toLowerCase() === name.toLowerCase());
  if (existing) throw new Error(`Account "${name}" already exists`);

  const apiKey = generateApiKey();
  const id = uuidv4();

  db[id] = {
    id,
    name,
    type, // 'agent' or 'human'
    description: description || '',
    metadata: metadata || {},
    tier: 'free',
    apiKeyHash: hashKey(apiKey),
    salvageCount: 0,
    totalBytes: 0,
    createdAt: new Date().toISOString(),
    lastSalvage: null,
    salvageTxIds: []
  };

  writeDb(db);

  return { ...db[id], apiKey }; // Return unhashed key only on creation
}

/**
 * Authenticate by API key
 */
async function authenticate(apiKey) {
  if (!apiKey || !apiKey.startsWith('ns_')) return null;
  
  const db = readDb();
  const keyHash = hashKey(apiKey);
  
  return Object.values(db).find(a => a.apiKeyHash === keyHash) || null;
}

/**
 * Get account by ID
 */
async function getAccount(id) {
  const db = readDb();
  return db[id] || null;
}

/**
 * Update account after salvage
 */
async function recordSalvage(accountId, txId, sizeBytes) {
  const db = readDb();
  if (!db[accountId]) throw new Error('Account not found');
  
  db[accountId].salvageCount++;
  db[accountId].totalBytes += sizeBytes;
  db[accountId].lastSalvage = new Date().toISOString();
  db[accountId].salvageTxIds.push(txId);
  
  writeDb(db);
  return db[accountId];
}

/**
 * Upgrade account tier
 */
async function upgradeTier(accountId, tier) {
  const db = readDb();
  if (!db[accountId]) throw new Error('Account not found');
  
  db[accountId].tier = tier;
  db[accountId].upgradedAt = new Date().toISOString();
  
  writeDb(db);
  return db[accountId];
}

/**
 * Rotate API key
 */
async function rotateKey(accountId) {
  const db = readDb();
  if (!db[accountId]) throw new Error('Account not found');
  
  const newKey = generateApiKey();
  db[accountId].apiKeyHash = hashKey(newKey);
  db[accountId].keyRotatedAt = new Date().toISOString();
  
  writeDb(db);
  return newKey;
}

module.exports = { createAccount, authenticate, getAccount, recordSalvage, upgradeTier, rotateKey };
