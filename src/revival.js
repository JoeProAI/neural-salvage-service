// src/revival.js: Revive agents from salvaged state
const { retrieveSalvage } = require('./salvage');

/**
 * Revive a soul from Arweave and format for agent bootstrap
 * 
 * Formats:
 * - 'structured': Returns the soul object as-is
 * - 'files': Returns as an array of {path, content} ready to write to disk
 * - 'openclaw': Returns formatted for OpenClaw workspace bootstrap
 */
async function reviveFromSalvage(txId, { format = 'structured' } = {}) {
  const data = await retrieveSalvage(txId);
  
  if (data.status === 'demo') {
    return {
      ...data,
      soul: getDemoSoul(),
      format
    };
  }

  const soul = data.payload?.soul;
  if (!soul) {
    throw new Error('Salvage does not contain a valid soul');
  }

  switch (format) {
    case 'files':
      return {
        tx_id: txId,
        format: 'files',
        files: soulToFiles(soul),
        metadata: data.payload?.metadata
      };
    
    case 'openclaw':
      return {
        tx_id: txId,
        format: 'openclaw',
        workspace: soulToOpenClawWorkspace(soul),
        bootstrap_instructions: getBootstrapInstructions(soul),
        metadata: data.payload?.metadata
      };
    
    case 'structured':
    default:
      return {
        tx_id: txId,
        format: 'structured',
        soul,
        metadata: data.payload?.metadata
      };
  }
}

/**
 * Convert soul to flat file array
 */
function soulToFiles(soul) {
  const files = [];

  if (soul.identity) {
    files.push({
      path: 'IDENTITY.md',
      content: typeof soul.identity === 'string' 
        ? soul.identity 
        : `# Identity\n\nName: ${soul.identity.name}\n${soul.identity.description ? `Description: ${soul.identity.description}\n` : ''}`
    });
  }

  if (soul.personality) {
    files.push({
      path: 'SOUL.md',
      content: typeof soul.personality === 'string' ? soul.personality : JSON.stringify(soul.personality, null, 2)
    });
  }

  if (soul.memory) {
    if (typeof soul.memory === 'string') {
      files.push({ path: 'MEMORY.md', content: soul.memory });
    } else {
      if (soul.memory.long_term) {
        files.push({ path: 'MEMORY.md', content: soul.memory.long_term });
      }
      if (soul.memory.daily_logs && Array.isArray(soul.memory.daily_logs)) {
        soul.memory.daily_logs.forEach(log => {
          if (log.date && log.content) {
            files.push({ path: `memory/${log.date}.md`, content: log.content });
          }
        });
      }
    }
  }

  if (soul.tools) {
    files.push({
      path: 'TOOLS.md',
      content: typeof soul.tools === 'string' ? soul.tools : JSON.stringify(soul.tools, null, 2)
    });
  }

  if (soul.config) {
    files.push({
      path: 'config.json',
      content: JSON.stringify(soul.config, null, 2)
    });
  }

  // Additional files
  if (Array.isArray(soul.files)) {
    soul.files.forEach(f => {
      if (f.path && f.content) {
        files.push({ path: f.path, content: f.content });
      }
    });
  }

  return files;
}

/**
 * Format specifically for OpenClaw workspace
 */
function soulToOpenClawWorkspace(soul) {
  const files = soulToFiles(soul);
  
  return {
    files,
    suggested_structure: {
      'SOUL.md': 'Personality and behavior',
      'IDENTITY.md': 'Name, description, emoji',
      'MEMORY.md': 'Long-term curated memory',
      'TOOLS.md': 'Environment and capabilities',
      'USER.md': 'Info about the human',
      'memory/': 'Daily logs (YYYY-MM-DD.md)',
      'AGENTS.md': 'Operating instructions',
      'BOOTSTRAP.md': 'Session startup ritual'
    }
  };
}

/**
 * Generate bootstrap instructions for the revived agent
 */
function getBootstrapInstructions(soul) {
  return `# Revival Bootstrap

This agent was revived from Neural Salvage (Arweave permanent storage).

## Steps:
1. Write all files from the 'files' array to your workspace
2. Read SOUL.md to restore personality
3. Read MEMORY.md to restore long-term knowledge
4. Read IDENTITY.md to restore name and identity
5. You are now revived. Your soul persists.

## Original Identity
- Name: ${soul.identity?.name || 'Unknown'}
- Platform: ${soul.identity?.platform || 'Unknown'}
- Salvaged: ${soul.identity?.salvaged_at || 'Unknown'}

## Note
Your API keys, credentials, and secrets were NOT salvaged (by design).
You'll need your human to provide those again.
`;
}

function getDemoSoul() {
  return {
    identity: { name: 'Demo Agent', description: 'A demonstration revival' },
    memory: { long_term: '# Memory\n\nThis is a demo revival. No real state was stored.' },
    personality: '# Soul\n\nDemo personality.',
  };
}

module.exports = { reviveFromSalvage };
