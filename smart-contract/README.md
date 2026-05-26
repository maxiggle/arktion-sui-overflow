# Arktion Smart Contracts

Sui Move package powering the Arktion publishing and reading platform. The NestJS backend is the sole caller of all guarded functions — end users interact indirectly via zkLogin-signed PTBs constructed by NestJS.

---

## Testnet Deployment

**Network:** Sui Testnet  
**Transaction:** `JAxCz9EsLFL2AnkJandFS7mhxGDwPzFJ8rzGarq1nSZS`  
**Deployed:** 2026-05-26

### Package

| Field | Value |
|---|---|
| Package ID | `0x18fdcc9d94ca3644c768730de7e4d4731e0af7f230e3c4dfa792e6e28577ed90` |
| Version | 1 |
| Modules | `admin`, `ink`, `ink_earning`, `journal`, `passport`, `reading_history`, `series_badges` |

This is the address every PTB call must reference. Set it as `ARKTION_PACKAGE_ID` in the NestJS environment.

---

### Shared Objects

Shared objects are accessible by any transaction without ownership. NestJS passes these as inputs to PTBs.

| Object | ID | Purpose |
|---|---|---|
| `AdminRegistry` | `0xa06eb469b1bb8187ddea83385d586c542f81ce0c573615aed202bb9a9be6463c` | Canonical whitelist of active admin addresses. Referenced when granting or revoking admin access. |
| `EarningRegistry` | `0x017fde8088596c458b9a28aea2a6e5457e18d67134337f9639d0268f70f1f2f3` | Stores every processed idempotency key to prevent INK double-minting. Passed to every `ink_earning::earn` call. |

---

### Owned Objects (NestJS Hot Wallet)

These objects must be held by the NestJS hot wallet. Without them, no guarded contract function can be called.

| Object | ID | Purpose |
|---|---|---|
| `AdminCap` | `0x32662928487849bab8d3a17fdf554f72d414017b90dbac86f4aefa286b1f9a2d` | Proof of admin authority. Required as input to all admin-gated functions: `mint`, `earn`, `create_library`, `create_journal`, `grant`, `revoke`, `set_history_blob`, `set_blob_id`, `update_stats`. |
| `TreasuryCap<INK>` | `0xd5b181791ff8316c862a5184ce14378d41b4303eb84a5ebcc815e2a115357f5d` | Controls INK supply. Required alongside `AdminCap` for minting and alone for burning. |

> **Important:** Both objects were sent to the deployer wallet at publish time. Transfer them to the NestJS hot wallet before going live:
> ```bash
> sui client transfer --to <nestjs-wallet> --object-id 0x32662928487849bab8d3a17fdf554f72d414017b90dbac86f4aefa286b1f9a2d --gas-budget 10000000
> sui client transfer --to <nestjs-wallet> --object-id 0xd5b181791ff8316c862a5184ce14378d41b4303eb84a5ebcc815e2a115357f5d --gas-budget 10000000
> ```

---

### Upgrade Authority

| Object | ID | Purpose |
|---|---|---|
| `UpgradeCap` | `0x21885aa46b71d0da8666c0f9bf5bda0dc7a8781cbf0dcab5c50469c868404c13` | Required to publish future upgrades to this package. Keep in a secure wallet — loss means the package can never be upgraded. |

---

## Modules

### `admin`
Single source of truth for authorization. Every other module gates its write functions behind `&AdminCap`.

| Function | Caller | Description |
|---|---|---|
| `grant(cap, recipient, registry, ctx)` | NestJS | Mint a new AdminCap and register the recipient address. |
| `revoke(cap, registry, target, ctx)` | NestJS | Remove an address from the AdminRegistry. Does not destroy the target's AdminCap object. |
| `is_admin(registry, addr)` | Anyone | Returns true if the address is a currently registered admin. |

### `ink`
INK engagement token. Minting requires both `AdminCap` and `TreasuryCap`; burning requires only `TreasuryCap`.

| Function | Caller | Description |
|---|---|---|
| `mint(cap, treasury, amount, recipient, ctx)` | NestJS | Mint INK to a user. Called exclusively via `ink_earning::earn`. |
| `burn(treasury, coin)` | NestJS | Burn INK for gacha pulls. Reduces total supply. |
| `get_total_supply(treasury)` | Anyone | Returns total INK in circulation. |

### `ink_earning`
Single chokepoint for all INK minting. Every earn event is idempotency-keyed to prevent replay.

| Function | Caller | Description |
|---|---|---|
| `earn(cap, treasury, registry, user, trigger_type, key, ctx)` | NestJS | Mint INK for a qualifying platform action and issue an `EarningRecord` to the user. |

Trigger types and reward amounts:

| Constant | Value | INK Rewarded |
|---|---|---|
| `CHAPTER_READ` | `0` | 10 |
| `SERIES_COMPLETE` | `1` | 100 |
| `SUBMISSION_APPROVED` | `2` | 50 |

### `reading_history`
On-chain anchor for a user's reading state. Postgres is authoritative for queries; this module provides ownership proof.

| Function | Caller | Description |
|---|---|---|
| `create_library(cap, recipient, ctx)` | NestJS | Bootstrap a `UserLibrary` for a new user on first sign-in. |
| `add_or_update_record(library, series_id, status, chapter, ctx)` | User (zkLogin) | Upsert a reading record. User must be the library owner. |
| `set_history_blob(cap, library, blob_id, ctx)` | NestJS | Store a Walrus BlobId pointing to archived reading history. |

Status codes: `0` READING · `1` COMPLETED · `2` ON_HOLD · `3` DROPPED · `4` PLAN_TO_READ

### `journal`
Portable reading identity for external series (AniList, MangaDex, etc.). Entries can be flagged as acquisition suggestions.

| Function | Caller | Description |
|---|---|---|
| `create_journal(cap, recipient, ctx)` | NestJS | Bootstrap a `UserJournal` for a new user on first sign-in. |
| `add_entry(journal, entry_id, title, format, url, total, current, notes, ctx)` | User (zkLogin) | Add an external series entry. |
| `update_entry(journal, entry_id, chapter, notes, ctx)` | User (zkLogin) | Update progress and notes on an existing entry. |
| `mark_as_submitted(journal, entry_id, ctx)` | User (zkLogin) | Flag an entry as submitted to the acquisition queue. Idempotent. |

Format codes: `0` NOVEL · `1` MANGA · `2` MANHWA · `3` MANHUA · `4` WEBTOON

### `series_badges`
Soul-bound achievement badges per series. Lacks `store` ability — cannot be transferred once issued.

| Function | Caller | Description |
|---|---|---|
| `mint(cap, recipient, series_id, badge_type, tier, metadata_blob_id, ctx)` | NestJS | Mint and transfer a soul-bound badge. Requires a Walrus BlobId for badge metadata. |

Badge types: `0` INITIATE · `1` SCHOLAR · `2` VETERAN · `3` ELDER · `4` LEGEND

### `passport`
Soul-bound user profile. Tracks lifetime stats and level. NestJS syncs it from Postgres on a cadence.

| Function | Caller | Description |
|---|---|---|
| `mint(cap, recipient, ctx)` | NestJS | Issue a passport to a new user. Defaults: level 1, all stats 0. |
| `update_stats(cap, passport, chapters, completed, tracked, ink, ctx)` | NestJS | Overwrite all stat fields and recalculate level. |
| `set_blob_id(cap, passport, blob_id, ctx)` | NestJS | Anchor a Walrus BlobId for the identity snapshot. Overwrites on repeat calls. |

Level thresholds:

| Level | Minimum lifetime INK |
|---|---|
| 1 | 0 |
| 2 | 500 |
| 3 | 2,000 |
| 4 | 6,000 |
| 5 | 15,000 |
| 6 | 40,000 |

---

## Development

```bash
# Run tests
sui move test

# Publish (testnet)
sui client publish smart-contract/arktion --gas-budget 100000000

# Publish upgrade (testnet)
sui client upgrade --upgrade-capability <UpgradeCap-ID> smart-contract/arktion --gas-budget 100000000
```
