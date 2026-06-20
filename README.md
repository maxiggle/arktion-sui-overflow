# Arktion

**The creator-owned publishing and reading ecosystem built on Sui.**

> Sui Overflow 2026 hackathon submission · Walrus track

---

## Table of Contents

- [Introduction](#introduction)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [What was Built](#what-was-built)
  - [Authentication & Identity](#authentication--identity)
  - [Reading](#reading)
  - [Economy & Community](#economy--community)
  - [Creator Tools](#creator-tools)
  - [Admin](#admin)
  - [Infrastructure](#infrastructure)
- [Architecture](#architecture)
  - [Stack](#stack)
  - [How it fits together](#how-it-fits-together)
  - [Frontend structure](#frontend-structure)
  - [Three-layer currency](#three-layer-currency)
  - [Smart contracts](#smart-contracts-8-modules-sui-testnet)
  - [Why Sui](#why-sui)
- [AI Writing Assistant](#ai-writing-assistant)
  - [What it does](#what-it-does)
  - [How the backend works](#how-the-backend-works)
  - [Configuration](#configuration)
- [Roadmap](#roadmap)
  - [Before June 20](#before-june-20-hackathon-deadline)
  - [Phase 2 — Publishing and Payments](#phase-2--publishing-and-payments)
  - [Phase 3 — Community Economy](#phase-3--community-economy)
- [Local Development](#local-development)
  - [Prerequisites](#prerequisites)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [Required environment variables](#required-environment-variables)

---

## Introduction

Arktion is a censorship-resistant platform for manga, manhwa, manhua, web novels, and fanfiction. It gives creators permanent ownership of their audience and earnings, and gives readers a portable, verifiable on-chain reading identity.

No platform intermediary. No overnight bans. No revenue cuts held by a middleman. Just creators and readers connected directly — with blockchain as the infrastructure that makes that guarantee unbreakable.

The global web novel translation market reached **$1.26 billion in 2024** and is growing at **16.8% CAGR through 2033**, serving over 600 million readers worldwide. That community is enormous, passionate, and deeply underserved by every platform that currently exists for it.

---

## The Problem

A fan translator earns $2,000/month building a loyal readership over years. One morning their Patreon account is banned. No warning, no appeal, no recourse. Their income is gone and the audience they built belongs to Patreon, not them.

This is not a rare edge case. It is the operating reality for thousands of creators in this space.

| Actor                 | Core Pain                                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Fan Translator        | Ko-fi and Patreon ban accounts without warning. No ownership of subscriber relationships.                                    |
| Original Novel Author | Platforms take 30–50% of revenue, own the audience, and can demonetize at will.                                              |
| Fanfiction Author     | Zero monetization. AO3 prohibits it. Wattpad doesn't support it properly. Massive communities earn nothing.                  |
| Comic / Manga Artist  | No independent distribution. Webtoon and Tapas take significant cuts and own the audience.                                   |
| Scanlator             | Translates visual works with no payment infrastructure.                                                                      |
| Reader (Tracker)      | Reading history split across AniList, MAL, NovelUpdates, and spreadsheets. No portable identity.                             |
| Reader (Tipper)       | Ko-fi and Patreon work poorly in Nigeria, Philippines, Indonesia, Vietnam — where a huge proportion of this community lives. |

The fanfiction dimension is particularly underexplored. In Webnovel comment sections, readers regularly commission original crossover works (Naruto in the Marvel universe, translated Korean manhwa fanfics of Japanese originals) via Discord PayPal links that can be frozen. Arktion is the first platform to address this as a first-class feature.

---

## The Solution

Arktion replaces the platform middleman with Sui smart contracts. Creators own their audience wallets directly — no platform can revoke that. Earnings flow peer-to-peer in USDC on Sui, gas-sponsored so users never need to hold SUI. Readers build a portable on-chain reading identity through the ArktionPassport, an NFT that accumulates history and levels across every series they read — not locked to any one platform. The INK token, earned only through reading, gives the community real governance weight over what content gets added without letting anyone buy their way in.

---

## What was Built

### Authentication & Identity

- **Google OAuth with invisible Sui wallet** via zkLogin — no seed phrase, no browser extension, no crypto knowledge required
- **ArktionPassport** minted on first login — soul-bound NFT accumulating reading history, INK balance, badges, and level; non-transferable at the Move type level
- **Six reader levels** (Wanderer → Arktion Elder) based on INK earned, not spent — no pay-to-win

### Reading

- **Reading library** — track progress across all series with statuses: Reading, Completed, On-Hold, Dropped, Plan to Read
- **Format-aware reader** — vertical scroll for manhwa/webtoon, paginated for manga/manhua, markdown renderer for novels
- **MangaDex integration** — 10,000+ series available at launch via API adapter
- **External journal** — track series on other platforms stored on-chain for portability
- **Reading history page** — full log of chapters read across all series

### Economy & Community

- **INK token** — earned through reading, never purchasable; minted on Sui via `ink_earning` with idempotency keys preventing double-minting. Earning rates: 10 INK per chapter read, 100 INK for completing a series, 50 INK when a community submission you made gets approved by the DAO.
- **Six reader levels** — Wanderer (0 INK) → Seeker (500) → Devoted (2,000) → Lorekeeper (6,000) → Chronicle (15,000) → Arktion Elder (40,000). Level is calculated from _lifetime_ INK earned, not current balance, so spending INK never demotes a reader. Each level has its own passport NFT visual — a dynamic SVG generated and served directly from the backend, which is what Sui explorers and NFT marketplaces display.
- **USDC tipping** — direct to creator wallets on Sui, gas sponsored, ~400ms confirmation; wallet funded manually for now (Transak on-ramp is Phase 2)
- **Soul-bound badge system** — reading achievements, community badges, series credentials; minted on-chain, non-transferable
- **Community series submissions** — any reader can suggest a series for the platform; approved submissions earn the submitter 50 INK + a Contributor badge, minted atomically in a single sponsored PTB
- **DAO voting on submissions** — INK-weighted community governance. The eligibility requirement is simple: a reader must hold at least 1 INK, which means they must have actually read at least one chapter on Arktion. A brand-new account that has never opened a chapter cannot vote. Vote weight equals the voter's current INK balance at cast time — readers who have read more chapters carry proportionally more influence over what gets added to the platform. Quorum: 500 total INK weight across all votes. Approval threshold: 60%. Voting window: 7 days. The outcome auto-finalises the moment quorum and a decisive margin are both met, without any manual step. Admin emergency override is retained for spam or abuse cases.

### Creator Tools

- **Creator application flow** — creators apply from within the reader app; application status tracked in Postgres
- **Creator portal** — publish series, manage chapters, view earnings
- **Novel chapter editor** — split-pane markdown editor with live preview, word count, and read-time estimate; content uploaded to Walrus
- **Image chapter upload** — drag-and-drop page upload for manga/manhwa formats, uploaded to Walrus
- **AI Writing Assistant** — context-aware writing panel embedded in the chapter editor (see section below)

### Admin

- **Admin dashboard** — REVIEWER and MODERATOR roles with TOTP, audit-logged actions, user management, content reports, and on-chain contract monitoring
- **Four-eyes principle** — admin role assignment requires confirmation from a second admin

### Infrastructure

- **8 Move smart contracts** deployed on Sui testnet (`ink`, `ink_earning`, `passport`, `reading_history`, `journal`, `submission`, `badges`, `admin`)
- **NestJS backend** — sole point of contact with Sui; constructs, sponsors, and submits every transaction
- **Gas sponsorship** — every user transaction is wrapped in a sponsored PTB; users never need SUI
- **Walrus storage** — novel chapter content, badge metadata, reading history snapshots stored as content-addressed blobs

---

## AI Writing Assistant

The AI writing assistant is a bonus feature built on top of Phase 1 to support original novel creators. It was not in the original hackathon scope but extends naturally from the creator tooling.

### What it does

The assistant lives as a collapsible sidebar panel inside the novel chapter editor. It has three tabs:

**Chat** — multi-turn conversation scoped to the creator's series. Ask questions about plot consistency, character motivations, or brainstorm story directions. Every message includes the full conversation history so the model maintains context across the session. Responses render as markdown. Individual assistant messages can be inserted directly at the cursor position in the editor.

**Suggest** — generates a 2–3 paragraph continuation based on the last 3,000 characters of the current chapter draft. The creator can Accept (appending the text to the editor) or Reject. Auto mode fires a suggestion automatically 3 seconds after the user stops typing, if the chapter has at least 100 characters.

**Models** — browse and switch the underlying language model. Fetches the full OpenRouter catalogue live, filtered to text-output models only. Shows free and paid models separately with context window size. The selected model is persisted in the store and used for all subsequent chat and suggestion requests.

### How the backend works

The backend AI service (`AiService`) operates in two parts:

**MemWal recall** — when a creator has published chapters, those chapters are indexed in [MemWal](https://memory.walrus.xyz) (Walrus Memory), a Walrus-backed semantic memory store, scoped to a namespace per series (`arktion-{seriesId}`). When a new query arrives, the service recalls the most relevant 6 chapter excerpts and prepends them to the system prompt. This grounds the model in the series' actual content — characters, events, writing style — without the creator having to paste context manually. Indexing happens fire-and-forget after chapter publish; it never blocks the publish response.

**OpenRouter completion** — after recall, a single `fetch` call is made to `https://openrouter.ai/api/v1/chat/completions` with the series title, optional description, recalled memories, and conversation history assembled into a system prompt. The model is configurable per-request (the creator's selection from the Models tab is forwarded). An `AbortController` with a 110-second timeout prevents silent connection drops on long generations.

### Configuration

```env
OPENROUTER_API_KEY=       # get a free key at openrouter.ai
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free   # default; overridable per-request
MEMWAL_PRIVATE_KEY=       # Ed25519 delegate key from memory.walrus.xyz dashboard
MEMWAL_ACCOUNT_ID=        # MemWalAccount object ID (0x…)
MEMWAL_SERVER_URL=https://relayer-staging.memory.walrus.xyz
```

MemWal is required. The service will refuse to start if `MEMWAL_PRIVATE_KEY` or `MEMWAL_ACCOUNT_ID` are missing — chapter memory is the backbone of the assistant's context.

---

## Architecture

### Stack

| Layer        | Technology                                                               |
| ------------ | ------------------------------------------------------------------------ |
| Frontend     | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Zustand, shadcn/ui |
| Backend      | NestJS, Prisma, PostgreSQL                                               |
| Auth         | Sui zkLogin (Google OAuth → invisible wallet)                            |
| Blockchain   | Sui testnet, Move smart contracts                                        |
| Blob Storage | Walrus (decentralized, content-addressed)                                |
| AI           | OpenRouter API + MemWal (Walrus Memory)                                  |
| Payments     | USDC on Sui (Transak on/off-ramp in Phase 2)                             |

### How it fits together

```
Next.js (port 3001)
    ↓ REST /api/v1
NestJS (port 3000)
    ↓ Prisma          ↓ Sui SDK
PostgreSQL         Sui testnet
                       ↕
                    Walrus
```

The backend is the sole point of contact with the blockchain. The frontend never constructs or signs transactions — NestJS constructs, sponsors, and submits every Sui PTB on behalf of the user.

### Frontend structure

```
lib/types/     Entity interfaces — single source of truth, no runtime code
lib/api/       Typed async functions — pure HTTP, no state
stores/        Zustand stores — state + actions, calls lib/api/
components/    Presentational UI — receives props or calls stores
app/           Next.js pages — compose stores and components only
```

### Three-layer currency

**USDC** — all creator payments: tips, chapter purchases, bounty pools. Always shown as dollar amounts, never as crypto. Loaded via Transak on-ramp.

**INK** — platform engagement token. Earned only through reading; never purchasable. 10 INK per chapter, 100 INK per series completed, 50 INK for an approved submission. Used for DAO voting weight, and (Phase 3) gacha burns and prediction market stakes. Closed-loop at launch; DEX trading requires community governance vote.

**ArktionPassport** — soul-bound NFT that is the reader's on-chain identity. It accumulates reader level, lifetime INK earned, chapters read, series completed, and badge references. Level is determined by lifetime INK earned (never by current balance), progressing through six named tiers: Wanderer → Seeker → Devoted → Lorekeeper → Chronicle → Arktion Elder. The passport image is a dynamically generated SVG that updates to reflect the reader's current level and colour theme — visible directly on Sui explorers and NFT marketplaces without any additional metadata service.

### Smart contracts (8 modules, Sui testnet)

| Module                     | Description                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `arktion::admin`           | Admin capability and platform governance controls                                                   |
| `arktion::ink`             | Fungible INK token; TreasuryCap held by NestJS, closed-loop at launch                               |
| `arktion::ink_earning`     | Controlled minting gate; all earning triggers defined here; idempotency keys prevent double-minting |
| `arktion::passport`        | Soul-bound ArktionPassport NFT; non-transferable at Move type level                                 |
| `arktion::reading_history` | On-chain reading record anchor; full history archived to Walrus                                     |
| `arktion::journal`         | External series entries stored on-chain for portability                                             |
| `arktion::submission`      | Community series suggestion registry; approval triggers INK reward + Contributor badge              |
| `arktion::badges`          | Soul-bound credential NFTs for reading achievements and community contributions                     |

### Why Sui

**zkLogin** — the only production-ready invisible wallet. Users sign in with Google and receive a Sui wallet with no seed phrase and no crypto UX.

**Sponsored transactions** — NestJS acts as gas sponsor so users never need SUI. At Sui's current gas prices, sponsoring 1 million transactions costs approximately $10–50.

**Move's type system** — soul-bound badges are non-transferable because the Move type system enforces it at the language level, not as a policy check.

**400ms finality** — sub-second confirmation makes the tipping UX feel instant.

**Walrus** — Sui's native decentralized blob storage gives content-addressed permanence to chapter content, badge metadata, and reading history snapshots. Content survives even if Arktion's servers disappear.

---

## Roadmap

### Before June 20 (hackathon deadline)

- End-to-end smoke test: sign in → create series → publish chapter → reader reads → tip creator
- Production database migration for DAO `SubmissionVote` table
- Demo video and hackathon submission write-up

### Phase 2 — Publishing and Payments

- Comic Studio — panel upload, page ordering, image compression pipeline, format-aware reading direction
- Fanfiction Studio — source IP linking, World Bible system, community mode with voluntary tipping
- Translation Studio — language editions switchable per series; three-party revenue splits in smart contract
- Licensed chapter sales — configurable split ratios (translator / original author / platform treasury) executed atomically in a single PTB
- Creator audience ownership on-chain — subscriber list with continuity handoff protocol; transferable when a translator hands a series to a successor
- IP licensing marketplace — two-party and three-party revenue split agreements encoded in smart contract
- Translation bounty board — crowdfunded pools; BlobId of delivered chapter stored on-chain; community approval triggers payout
- Transak on/off-ramp — fiat to USDC in 170+ countries; KYC handled by Transak; platform never touches user fiat
- Resumption alerts — push notifications when a dropped series is picked up by a new translator
- React Native mobile app

### Phase 3 — Community Economy

- Gacha collectibles — INK burn to random cNFT; Kiosk policy enables secondary market trading
- Prediction markets — stake INK on story outcomes; platform takes 2% fee on resolution
- Fan DAO — series feature voting and quality dispute resolution
- AI translation co-pilot — assisted translation for fan translators
- Southeast Asia expansion — Filipino, Indonesian, Thai translator communities
- Publisher licensing partnerships — Korean and Japanese rights holders
- INK governance vote on DEX trading

---

## Local Development

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL
- Sui CLI (for contract deployment)

### Backend

```bash
cd backend
pnpm install
cp .env.example .env   # fill in required values
pnpm prisma migrate dev
pnpm dev               # runs on :3000
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev               # runs on :3001
```

### Required environment variables

**Backend (`.env`)**

```env
# Database
DATABASE_URL=postgresql://...

# Sui
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io
ADMIN_PRIVATE_KEY=          # NestJS gas sponsor wallet
PACKAGE_ID=                 # deployed arktion package object ID
INK_TREASURY_CAP_ID=
PASSPORT_ADMIN_CAP_ID=
BADGE_ADMIN_CAP_ID=
SUBMISSION_REGISTRY_ID=
INK_EARNING_CONFIG_ID=

# Auth
ENOKI_API_KEY=              # Sui zkLogin salt service
JWT_SECRET=
JWT_EXPIRY=7d

# Walrus
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space

# AI — MemWal and OpenRouter are both required for the writing assistant
OPENROUTER_API_KEY=
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
MEMWAL_PRIVATE_KEY=
MEMWAL_ACCOUNT_ID=
MEMWAL_SERVER_URL=https://relayer-staging.memory.walrus.xyz

# Admin
TOTP_ENCRYPTION_KEY=
```

**Frontend (`.env.local`)**

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_SUI_NETWORK=testnet
```

---

_Built on Sui. Owned by creators._
