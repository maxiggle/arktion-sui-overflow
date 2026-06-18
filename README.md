# Arktion

**The creator-owned publishing and reading ecosystem built on Sui.**

---

## Introduction

Arktion is a censorship-resistant platform for manga, manhwa, manhua, web novels, and fanfiction. It gives creators permanent ownership of their audience and earnings, and gives readers a portable, verifiable on-chain reading identity.

No platform intermediary. No overnight bans. No revenue cuts held by a middleman. Just creators and readers connected directly — with blockchain as the infrastructure that makes that guarantee unbreakable.

The global web novel translation market reached **$1.26 billion in 2024** and is growing at **16.8% CAGR through 2033**, serving over 600 million readers worldwide. That community is enormous, passionate, and deeply underserved by every platform that currently exists for it.

---

## The Problem

A fan translator earns $2,000/month building a loyal readership over years. One morning their Patreon account is banned. No warning, no appeal, no recourse. Their income is gone and the audience they built belongs to Patreon, not them.

This is not a rare edge case. It is the operating reality for thousands of creators in this space.

### Who gets hurt and how

**Fan Translators** — Ko-fi and Patreon ban accounts without warning. The creator owns nothing: not the subscriber list, not the payment relationship, not the audience. Moving platforms means starting from zero.

**Original Novel Authors** — Platforms like Webnovel and Scribble Hub take 30–50% of revenue, own the audience, and can demonetize at will. There is no portable subscriber list.

**Fanfiction Authors** — The largest underserved segment. AO3 prohibits monetization. Wattpad does not support it properly. Readers actively commission fanfiction in comment sections and Discord channels, sending money through PayPal links that can be frozen. Massive creative communities earn nothing for work that builds platforms worth hundreds of millions of dollars.

**Comic and Manga Artists** — No independent distribution built for their format. Webtoon and Tapas take significant revenue cuts and own the audience relationship.

**Scanlators** — Translate visual works with no payment infrastructure. Communities depend on them entirely but they have no economic home.

**Readers** — Reading history split across AniList, MAL, NovelUpdates, and spreadsheets. No single portable identity. Series disappear when translators drop them. Payment methods like PayPal and Stripe work poorly in the Philippines, Indonesia, Nigeria, and Vietnam — where a huge proportion of this global community actually lives.

The fanfiction dimension is particularly underexplored. Readers commission original crossover works (Naruto in the Marvel universe, translated Korean manhwa fanfics of Japanese originals) through informal channels with no formal infrastructure. Arktion is the first platform to address this as a first-class feature.

---

## What We Are Building

Arktion solves these problems at the infrastructure level, not the policy level.

### Creator-owned payments

USDC tips and chapter purchases go directly to creator wallets on Sui. No platform can freeze, redirect, or take a cut of the base payment. The payment rail is the blockchain — it has no terms of service that can change overnight.

### Creator-owned audiences

The subscriber relationship between a creator and their readers lives on-chain. When a translator hands off a series to a successor, the subscriber list transfers with it automatically via smart contract. No platform can revoke it.

### Portable reading identity

Every user gets a soul-bound **ArktionPassport** — a non-transferable NFT minted on Sui at account creation. It accumulates verified proof of reading history, community contributions, and creator support. It is owned by the reader forever and is readable by any application that can read Sui blockchain state. No platform can revoke it. If Arktion's servers went down tomorrow, the reading history still exists.

### Invisible blockchain

Users sign in with Google. That is the entire onboarding flow. Sui's zkLogin creates a wallet invisibly — no seed phrase, no browser extension, no crypto knowledge required. Gas fees on every transaction are sponsored by Arktion's backend so users never need to acquire SUI. The blockchain is load-bearing infrastructure that the user never has to think about.

### The five creator types

Arktion is built for five distinct creator roles, each with its own studio:

- **Original Novel Authors** — serialized fiction with direct tips, chapter sales, subscriptions, and world licensing
- **Fan Translators** — publisher studio with payment rails and permanent audience ownership
- **Original Fanfiction Authors** — formal monetization for the largest underserved creative segment; readers can commission works
- **Fanfiction Translators** — three-party revenue splits handled automatically by smart contract
- **Comic/Manga/Manhwa/Manhua Artists** — format-aware upload with Walrus content storage

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
| Search       | Typesense                                                                |
| Payments     | USDC on Sui, Transak on/off-ramp                                         |

### How it fits together

```
Next.js (port 3001)
    ↓ REST /api/v1
NestJS (port 3000)
    ↓ Prisma
PostgreSQL  ←→  Walrus  ←→  Sui testnet
```

The backend is the sole point of contact with the blockchain. The frontend never constructs or signs transactions directly — it calls NestJS, which constructs, sponsors, and submits every Sui transaction on behalf of the user.

### Frontend structure

```
lib/types/     Entity interfaces — single source of truth, no runtime code
lib/api/       Typed async functions — pure HTTP, no state
stores/        Zustand stores — state + actions, calls lib/api/
components/    Presentational UI — receives props or calls stores
app/           Next.js pages — compose stores and components only
```

### On-chain identity and INK

Arktion operates a three-layer value system:

**USDC** is used for all creator payments — tips, chapter purchases, bounty pools. Always displayed as a dollar amount, never as crypto. Loaded via Transak, withdrawn to local bank via Transak.

**INK** is the platform engagement token. Earned only through reading actions and milestones — never purchasable with real money. Used for gacha pulls, prediction market stakes, DAO voting, and discovery boosts. Closed-loop at launch; DEX trading requires a community governance vote.

**ArktionPassport** accumulates reader level, INK balance, badges earned, chapters read, and series completed. Six reader levels from Wanderer to Arktion Elder, each unlocking progressively exclusive platform features. Levels are based on INK earned (not spent) to prevent pay-to-win dynamics.

### Smart contracts (8 modules on Sui)

- `arktion::admin` — admin capability and platform governance controls
- `arktion::ink` — fungible INK token; TreasuryCap held by NestJS, closed-loop at launch
- `arktion::ink_earning` — controlled minting gate with on-chain audit trail and idempotency keys
- `arktion::passport` — soul-bound ArktionPassport NFT; non-transferable at the Move type level
- `arktion::reading_history` — on-chain reading record anchor with Walrus archive support
- `arktion::journal` — external series entries stored on-chain for portability
- `arktion::submission` — community series suggestion registry; approval triggers INK reward
- `arktion::badges` — soul-bound credential NFTs for reading achievements and community contributions

### Why Sui

Sui was chosen deliberately for four specific capabilities:

**zkLogin** — the only production-ready invisible wallet. Users sign in with Google and get a Sui wallet with no seed phrase and no crypto UX.

**Sponsored transactions** — NestJS acts as gas sponsor so users never need SUI to use the app. At Sui's current gas prices, sponsoring 1 million transactions costs approximately $10–50.

**Move's type system** — soul-bound badges are non-transferable because the Move type system enforces it at the language level, not as a policy check.

**400ms finality** — sub-second transaction confirmation makes the tipping UX feel instant.

### Content on Walrus

Novel chapter content, badge metadata, reading history snapshots, and series cover art are stored on Walrus as content-addressed blobs. The BlobId is anchored in the relevant Sui object. If Arktion's servers disappear, the content and the user's reading identity still exist on-chain and on Walrus independently of any platform.

---

## What Is Built (Phase 1)

- Google OAuth sign-in with invisible Sui wallet creation via zkLogin
- ArktionPassport minting on first login (gas-sponsored)
- Reading library — track progress across all series (reading, completed, on-hold, dropped, plan to read)
- External journal — track series from other platforms, stored on-chain
- Community series submissions with INK rewards and soul-bound Contributor badge
- Soul-bound badge system — reading achievements, community badges, series-specific credentials
- INK earning through reading milestones
- MangaDex integration — 10,000+ series available at launch
- Format-aware reader — vertical scroll for manhwa/webtoon, paginated for manga/manhua, markdown for novels
- USDC tipping — direct to creator wallets on Sui, gas sponsored, 400ms confirmation
- Creator portal — apply, publish series, upload chapters (novel markdown + image formats), view earnings
- Novel chapter editor — split-pane markdown editor with word count and estimated read time; content stored on Walrus

---

## Remaining Roadmap

### Before June 20 (hackathon deadline)

- End-to-end smoke test: sign in → create series → publish chapter → reader reads → tip creator
- Fix reading record creation on first chapter read
- Notifications page
- Reading history page
- Production database migration for novel chapter content URL
- Demo video and hackathon submission

### Phase 2 — Publishing and Payments

- Text Studio — rich editor with draft queue, PDF/Word import, chapter scheduling, AI writing assist via Claude API
- Comic Studio — panel upload, page ordering, image compression pipeline
- Fanfiction Studio — source IP linking, World Bible system, community mode
- Translation Studio — language editions switchable per series
- Licensed chapter sales — smart contract fee splits
- Creator audience ownership on-chain — subscriber list with continuity handoff protocol
- IP licensing marketplace — two-party and three-party revenue splits
- Translation bounty board — crowdfunded translation pools
- Transak on-ramp and off-ramp — fiat to USDC in 170+ countries
- React Native mobile app

### Phase 3 — Community Economy

- Gacha collectibles — INK burn to cNFT with Kiosk secondary market
- Prediction markets — stake INK on story outcomes
- Fan DAO — series feature voting and quality dispute resolution
- AI translation co-pilot for fan translators
- Southeast Asia expansion — Filipino, Indonesian, Thai translator communities
- Publisher licensing partnerships — Korean and Japanese rights holders

---

## Local Development

```bash
# Backend
cd backend
pnpm install
pnpm prisma migrate dev
pnpm dev          # runs on :3000

# Frontend
cd frontend
pnpm install
pnpm dev          # runs on :3001
```

Environment variables are required for Sui RPC, zkLogin salt service, Walrus aggregator URL, Enoki API key, and PostgreSQL connection string.

---

_Built on Sui. Owned by creators._
