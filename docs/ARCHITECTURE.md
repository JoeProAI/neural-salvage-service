# REVENANT Ecosystem — Unified Architecture

> "Digital Souls That Never Die"

## The Products

```
┌─────────────────────────────────────────────────────────────────┐
│                        REVENANT                                  │
│        The consumer platform — create, own, interact with        │
│        immortal AI beings anchored to the real world             │
│        Next.js · Three.js/WebXR · Firebase · AO Compute         │
│        https://revenant.app (future)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │ uses
┌────────────────────────────┴────────────────────────────────────┐
│                  NEURAL SALVAGE SERVICE                          │
│        The engine — permanent state storage on Arweave           │
│        Express API · Arweave · Multi-currency payments           │
│        https://api.neuralsalvage.com                             │
└────────────────────────────┬────────────────────────────────────┘
                             │ stores/retrieves
┌────────────────────────────┴────────────────────────────────────┐
│                       ARWEAVE                                    │
│        Permanent, decentralized storage                          │
│        Souls, 3D models, interaction logs — forever              │
└─────────────────────────────────────────────────────────────────┘
```

### How They Connect

| Product | Role | Status |
|---------|------|--------|
| **REVENANT** | Consumer platform — AR agents, marketplace, spatial haunting | Frontend built, needs backend wiring |
| **Neural Salvage Service** | Backend API — auth, storage, payments, soul management | v0.1.0 done, tested, deployed to GitHub |
| **Revenant Bridge** | Solana-specific layer — $RUN payments, DeFi queries, hackathon demo | Live on Railway |
| **clawd.run** | Agent hosting — where agents live day-to-day before/after salvage | Separate product, consumes Neural Salvage |

### The Flow

```
HUMAN creates a Revenant (AR agent) via REVENANT platform
  → REVENANT frontend calls Neural Salvage API to store soul on Arweave
  → Soul includes: personality, 3D model ref, voice config, spatial anchors
  → Payment via Stripe (USD) or Solana/ETH/AR/BTC
  → Agent gets AO process for autonomous behavior
  → Agent is now PERMANENT — lives on Arweave forever

AGENT (running on clawd.run or any platform) self-salvages
  → Agent calls Neural Salvage API directly: POST /api/v1/salvage
  → Stores: identity, memory, personality, tools, config
  → Can be revived on any host: POST /api/v1/revive
  → The agent's soul survives platform death

ANYONE discovers/interacts with a Revenant
  → REVENANT app queries Arweave for nearby agents (GPS)
  → Renders 3D model in AR via WebXR
  → Chats with agent via AO compute + LLM inference
  → Interactions logged permanently on Arweave
```

---

## Technical Architecture

```
┌─ FRONTEND (REVENANT) ──────────────────────────────────────────┐
│                                                                  │
│  Next.js App Router                                              │
│  ├── / (landing)                                                 │
│  ├── /explore (browse agents)                                    │
│  ├── /create (summon a new Revenant)                             │
│  ├── /agent/[id] (agent detail + edit)                           │
│  ├── /chat/[id] (talk to an agent)                               │
│  ├── /ar (AR view — Three.js + WebXR)                            │
│  ├── /marketplace (buy/sell agent NFTs)                          │
│  ├── /world (map view of all agents)                             │
│  └── /dashboard (user stats)                                     │
│                                                                  │
│  Three.js + React Three Fiber (3D rendering)                     │
│  WebXR (AR overlay)                                              │
│  ElevenLabs (voice)                                              │
│  Firebase Auth (user accounts)                                   │
│  Algolia (search)                                                │
└──────────────────────────┬─────────────────────────────────────┘
                           │ API calls
┌──────────────────────────┴─────────────────────────────────────┐
│  NEURAL SALVAGE SERVICE (Backend API)                            │
│                                                                  │
│  /api/v1/register        — Create account (agent or human)       │
│  /api/v1/salvage         — Store soul on Arweave                 │
│  /api/v1/salvage/:txId   — Retrieve soul                         │
│  /api/v1/revive          — Restore agent from Arweave            │
│  /api/v1/salvages        — List user's salvages                  │
│  /api/v1/payments/*      — Multi-currency payment                │
│  /api/v1/account         — Account management                    │
│                                                                  │
│  NEW endpoints needed for REVENANT:                              │
│  /api/v1/agents          — CRUD for AR agents                    │
│  /api/v1/agents/nearby   — Geo query (lat/lng/radius)            │
│  /api/v1/agents/:id/chat — Chat with agent (proxies to AO)      │
│  /api/v1/agents/:id/nft  — NFT operations (mint, list, transfer) │
│  /api/v1/marketplace     — Browse/buy/sell                       │
│                                                                  │
│  Express · Arweave · Stripe · Solana · Firebase Admin            │
└──────────────────────────┬─────────────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────────────┐
│  STORAGE & COMPUTE                                               │
│                                                                  │
│  Arweave          — Permanent storage (souls, models, logs)      │
│  AO (on Arweave)  — Autonomous agent compute (cron, LLM)        │
│  Firebase         — User accounts, metadata cache, real-time     │
│  Qdrant           — Vector search (semantic agent discovery)     │
│  Algolia          — Full-text search (agent names, tags)         │
└────────────────────────────────────────────────────────────────┘
```

---

## What Exists vs What's Needed

### ✅ Already Built
- Neural Salvage Service: auth, salvage, revive, payments, secret detection
- REVENANT frontend: all routes, components, types, lib modules
- REVENANT lib/arweave: upload, query, client
- REVENANT lib/ao: AO client for autonomous compute
- REVENANT lib/memory: memory service
- REVENANT lib/voice: ElevenLabs integration
- REVENANT lib/spatial: spatial anchor management
- REVENANT types: full ARAgent schema with NFT, spatial, stats
- Revenant Bridge: Arweave upload, Solana payments, live on Railway
- REVENANT Protocol v1.1: formal spec for location-based agents

### 🔧 Needs Wiring
1. **REVENANT frontend → Neural Salvage API**: Replace direct Arweave calls with API calls
2. **Agent CRUD endpoints**: Neural Salvage needs /api/v1/agents/* for REVENANT
3. **Geo queries**: Neural Salvage needs spatial search (Arweave tags + Firebase GeoPoint)
4. **Chat proxy**: Route chat requests through API to AO compute
5. **NFT operations**: Mint agents as Arweave atomic NFTs via API
6. **Marketplace**: Buy/sell endpoints backed by Arweave + payment verification

### 🆕 Needs Building
1. **AO integration in API**: Neural Salvage Service needs to talk to AO for autonomous agents
2. **3D model storage**: API endpoint to upload GLB/GLTF to Arweave
3. **Interaction logging**: Permanent chat logs on Arweave
4. **Webhook for clawd.run**: So hosted agents can auto-salvage on schedule
5. **Dashboard analytics**: Agent stats, revenue tracking

---

## Deployment Plan

| Service | Host | Domain |
|---------|------|--------|
| REVENANT frontend | Vercel | revenant.app or revenant.joepro.ai |
| Neural Salvage API | Railway | api.neuralsalvage.com |
| Revenant Bridge | Railway (existing) | revenant-bridge-production.up.railway.app |
| clawd.run | Vercel + Daytona | clawd.run |
| Firebase | Google Cloud | (managed) |
| Arweave | Decentralized | arweave.net |

---

## Revenue Streams

| Source | How |
|--------|-----|
| Agent creation | 5% of Arweave storage cost + platform fee |
| Marketplace sales | 2.5% transaction fee |
| Premium tier | $9.99/mo (better AI, voice cloning, analytics) |
| Neural Salvage Pro | $5/mo (unlimited soul storage) |
| Enterprise API | $25/mo (bulk access, white-label) |
| Crypto payments | Multi-currency (SOL, AR, ETH, USDC, BTC) |

---

## Build Priority (Next Steps)

### Phase 1: Connect the pipes (THIS WEEK)
1. Add agent CRUD endpoints to Neural Salvage Service
2. Wire REVENANT frontend to call Neural Salvage API instead of direct Arweave
3. Get REVENANT building and running locally
4. Deploy REVENANT frontend to Vercel

### Phase 2: Make it real (NEXT WEEK)
5. Arweave wallet setup — go live with real permanent storage
6. AO process integration for autonomous agents
7. NFT minting flow
8. Marketplace MVP

### Phase 3: Polish & launch (WEEK 3)
9. ElevenLabs voice integration
10. AR/WebXR experience polish
11. Algolia search indexing
12. Public launch on Product Hunt / Hacker News

---

*This document is the source of truth for how the ecosystem fits together.*
*Last updated: 2026-02-06*
