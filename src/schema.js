// src/schema.js: Soul payload validation
// Defines what an AI soul looks like

/**
 * A soul is the non-secret state of an AI agent.
 * It contains everything needed to revive the agent's personality,
 * memory, and capabilities — but never credentials or API keys.
 * 
 * Minimal soul:   { identity: { name: "MyAgent" } }
 * Full soul:      { identity, memory, personality, tools, config, files }
 */

const FORBIDDEN_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,       // OpenAI keys
  /sk-ant-[a-zA-Z0-9-]+/,      // Anthropic keys
  /sk-or-[a-zA-Z0-9-]+/,       // OpenRouter keys
  /ghp_[a-zA-Z0-9]{36}/,       // GitHub PATs
  /gho_[a-zA-Z0-9]{36}/,       // GitHub OAuth
  /xai-[a-zA-Z0-9]+/,          // xAI keys
  /AIzaSy[a-zA-Z0-9_-]{33}/,   // Google API keys
  /-----BEGIN.*PRIVATE KEY/,    // Private keys
  /password\s*[:=]\s*\S+/i,    // Passwords
];

function validateSoulPayload(soul) {
  const errors = [];

  if (!soul || typeof soul !== 'object') {
    return { valid: false, errors: ['Soul must be a JSON object'] };
  }

  // Must have at least identity
  if (!soul.identity) {
    errors.push('Soul must include an "identity" object (at minimum { name: "..." })');
  } else if (!soul.identity.name) {
    errors.push('identity.name is required');
  }

  // Check for secrets in the entire payload
  const serialized = JSON.stringify(soul);
  
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(serialized)) {
      errors.push(`⚠️ BLOCKED: Payload contains what looks like a secret/credential. Neural Salvage stores data permanently on a public blockchain — never include API keys, passwords, or private keys. Remove the sensitive data and try again.`);
      break; // One warning is enough
    }
  }

  // Size check (serialized)
  const sizeBytes = Buffer.byteLength(serialized);
  if (sizeBytes > 104_857_600) { // 100MB hard cap
    errors.push(`Payload too large: ${(sizeBytes / 1_048_576).toFixed(1)}MB (max 100MB)`);
  }

  // Validate known fields
  const validFields = ['identity', 'memory', 'personality', 'tools', 'config', 'files', 'metadata'];
  const unknownFields = Object.keys(soul).filter(k => !validFields.includes(k));
  if (unknownFields.length > 0) {
    // Warning, not error — we accept extra fields
    // Just note it
  }

  return {
    valid: errors.length === 0,
    errors,
    size_bytes: sizeBytes,
    fields: Object.keys(soul),
    has_memory: !!soul.memory,
    has_personality: !!soul.personality,
    has_tools: !!soul.tools,
    has_files: Array.isArray(soul.files) && soul.files.length > 0
  };
}

module.exports = { validateSoulPayload, FORBIDDEN_PATTERNS };
