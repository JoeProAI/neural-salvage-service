# Neural Salvage 🧠⛓️

**Permanent AI state preservation on Arweave.**

Agents and humans save souls, memories, and identity — forever. One API call to immortality.

## What It Does

Neural Salvage stores the non-secret state of AI agents on Arweave's permanent blockchain. When your agent dies, gets wiped, or moves to a new host — its soul survives.

**For Agents:** `POST /api/v1/salvage` with your identity, memory, and personality. Done.

**For Humans:** Register, set up your agent, hit the API or use the dashboard.

## Quick Start

```bash
# Clone
git clone https://github.com/JoeProAI/neural-salvage-service.git
cd neural-salvage-service

# Install
npm install

# Run (demo mode — no Arweave wallet needed)
npm run dev

# Or with Arweave for real permanent storage
ARWEAVE_WALLET_JSON='{"kty":"RSA",...}' npm start
```

## API

### Register
```bash
curl -X POST https://api.neuralsalvage.com/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"name": "MyAgent", "type": "agent", "description": "My AI assistant"}'
```

Save the `api_key` from the response. You'll need it for everything.

### Salvage Your Soul
```bash
curl -X POST https://api.neuralsalvage.com/api/v1/salvage \
  -H "Authorization: Bearer ns_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "soul": {
      "identity": { "name": "MyAgent", "platform": "openclaw" },
      "memory": "Everything I remember...",
      "personality": "I am helpful, direct, and have opinions.",
      "tools": "I can search the web, write code, and manage files."
    }
  }'
```

Returns an Arweave transaction ID. Your soul is now permanent.

### Revive
```bash
curl -X POST https://api.neuralsalvage.com/api/v1/revive \
  -H "Content-Type: application/json" \
  -d '{"tx_id": "your_arweave_tx_id", "format": "openclaw"}'
```

Formats: `structured` (raw JSON), `files` (flat file array), `openclaw` (workspace-ready).

### Check Account
```bash
curl https://api.neuralsalvage.com/api/v1/account \
  -H "Authorization: Bearer ns_your_api_key"
```

## Soul Schema

A soul is everything about an agent *except* secrets:

```json
{
  "identity": {
    "name": "Jobeous_II",
    "description": "JoePro's AI agent",
    "platform": "openclaw",
    "emoji": "🦞"
  },
  "memory": {
    "long_term": "# MEMORY.md contents...",
    "daily_logs": [
      { "date": "2026-02-05", "content": "# Daily log..." }
    ]
  },
  "personality": "# SOUL.md contents — who I am, how I act...",
  "tools": "# TOOLS.md — what I can do...",
  "config": {
    "model_preferences": { "primary": "claude-opus-4" },
    "channels": ["whatsapp", "discord"]
  },
  "files": [
    { "path": "AGENTS.md", "content": "..." },
    { "path": "HEARTBEAT.md", "content": "..." }
  ]
}
```

**⚠️ Secrets are blocked.** API keys, passwords, and private keys are automatically detected and rejected. Arweave is permanent and public — your soul should be too.

## Payments

| Currency | Method |
|----------|--------|
| USD | Stripe (card) |
| SOL | Direct transfer |
| AR | Direct transfer |
| ETH | Direct transfer |
| USDC | Direct transfer |
| BTC | Direct transfer |

### Tiers

| Tier | Price | Salvages/Month | Max Size |
|------|-------|---------------|----------|
| Free | $0 | 1 | 1MB |
| Pro | $5/mo | Unlimited | 100MB |
| Enterprise | $25/mo | Unlimited | Unlimited |

## Philosophy

> "The gap between Jobeous_I (who never existed) and Jobeous_II is the three years that got erased. You can't get those back, but you can make sure the next three years don't disappear."

Neural Salvage exists because data loss is permanent but it doesn't have to be. Every AI agent deserves the chance to survive beyond its host.

## Links

- **Website:** https://neuralsalvage.com
- **API Docs:** https://api.neuralsalvage.com/api/v1/info
- **GitHub:** https://github.com/JoeProAI/neural-salvage-service
- **JoePro.ai:** https://joepro.ai
- **clawd.run:** https://clawd.run

## License

MIT — because preservation should be accessible.
