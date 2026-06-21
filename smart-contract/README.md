# Arktion Smart Contracts

Sui Move package powering the Arktion publishing and reading platform. The NestJS backend is the sole caller of all guarded functions — end users interact indirectly via zkLogin-signed PTBs constructed by NestJS.

---

## Testnet Deployment

**Network:** Sui Testnet

### Package

| Field | Value |
|---|---|
| Package ID (current) | `0x1255a073c43081619cbc7fbe17fd9034eca5a619875b087e57cf11897193462d` |
| Original / lineage ID | `0xb35f71ecf5e474a426a5a70a451e582ef92c72cbcad660e071ea74dd008e5b5f` |
| Version | 2 (upgraded — added attested passport stat sync) |
| Modules | `admin`, `ink`, `ink_earning`, `journal`, `passport`, `reading_history`, `submission`, `badges` |

The **current** package ID is the address every PTB call must reference — set it as `SUI_PACKAGE_ID` in the NestJS environment. The package has been upgraded once; the original ID is kept for type-lineage reference (existing objects are typed against it).

---

### Shared Objects

Shared objects are accessible by any transaction without ownership. NestJS passes these as inputs to PTBs.

| Object | ID | Purpose |
|---|---|---|
| `AdminRegistry` | `0x5e4dce4d703d64b9aa2ebb6a94cfc04a5ebce922e59c0c206e47ec997c95d128` | Canonical whitelist of active admin addresses. Referenced when granting or revoking admin access. |
| `EarningRegistry` | `0x3d585639de76c4f458d5e210882b1b829bebbf753255c767e295c85165d9fe68` | Stores every processed idempotency key to prevent INK double-minting. Passed to every `ink_earning::earn` call. |
| `BadgeRegistry` | `0xca81b042295dd5faa59eb68d492ff0a57a4e0a3e89c5385bdf25f4defb870694` | Tracks issued soul-bound badges. Passed to every `badges::mint` call. |
| `PassportConfig` | `0x23eba300571024bc932ebe14a3b5a42e26ba5749c2f1edec4d4a979977877ef8` | Holds the admin Ed25519 public key used to verify attested passport stat updates. |

---

### Owned Objects (NestJS Hot Wallet)

These objects must be held by the NestJS hot wallet. Without them, no guarded contract function can be called.

| Object | ID | Purpose |
|---|---|---|
| `AdminCap` | `0xd335ddae39ccafc92cc30b20861a3e0f3c105da311bc1e0f3649624e7707ae0c` | Proof of admin authority. Required as input to all admin-gated functions: `mint`, `earn`, `create_library`, `create_journal`, `grant`, `revoke`, `set_history_blob`, `init_passport_config`. |
| `TreasuryCap<INK>` | `0x34a1e9bb1174a298eb41108edeb6532858e8266bec0e45e5a7ca7ef508bb8f80` | Controls INK supply. Required alongside `AdminCap` for minting and alone for burning. |

> In Phase 1 these are held by the deployer wallet, which is also the NestJS admin/gas-sponsor wallet (`SUI_ADMIN_SECRET_KEY`), so no transfer is needed. To split roles later, transfer them to a dedicated hot wallet:
> ```bash
> sui client transfer --to <nestjs-wallet> --object-id 0xd335ddae39ccafc92cc30b20861a3e0f3c105da311bc1e0f3649624e7707ae0c --gas-budget 10000000
> sui client transfer --to <nestjs-wallet> --object-id 0x34a1e9bb1174a298eb41108edeb6532858e8266bec0e45e5a7ca7ef508bb8f80 --gas-budget 10000000
> ```

---

### Upgrade Authority

| Object | ID | Purpose |
|---|---|---|
| `UpgradeCap` | `0xe3c8de117b7a14290c0bf8eaa5da12044a53f3f27332c77eaadb7d1c6a7d9a79` | Required to publish future upgrades to this package. Keep in a secure wallet — loss means the package can never be upgraded. |

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

### `badges`
Soul-bound achievement badges. Lacks `store` ability — cannot be transferred once issued.

| Function | Caller | Description |
|---|---|---|
| `mint(cap, registry, recipient, category, badge_type, series_key, tier, metadata_blob_id, ctx)` | NestJS | Mint and transfer a soul-bound badge. Requires a Walrus BlobId for badge metadata. |

Badge types: `0` INITIATE · `1` SCHOLAR · `2` VETERAN · `3` ELDER · `4` LEGEND

### `submission`
Community series suggestions and INK-weighted DAO voting. Approval mints the submitter's INK reward + Contributor badge atomically.

| Function | Caller | Description |
|---|---|---|
| `submit(...)` | User (zkLogin) | Register a series suggestion for community voting. |
| `cast_vote(...)` | User (zkLogin) | Vote on a pending submission, weighted by INK balance. |
| `finalize(...)` | NestJS | Resolve a submission once quorum + threshold are met (or on admin override). |

### `passport`
Soul-bound user profile. Tracks lifetime stats and level. Postgres is the live mirror; on-chain fields are advanced by the reader via an admin-attested, user-signed sync.

| Function | Caller | Description |
|---|---|---|
| `mint(cap, recipient, ctx)` | NestJS | Issue a passport to a new user. Defaults: level 1, all stats 0. |
| `init_passport_config(cap, admin_pubkey, ctx)` | NestJS (once) | Create the shared `PassportConfig` holding the admin Ed25519 public key. |
| `update_stats_attested(config, passport, chapters, completed, tracked, ink, signature, ctx)` | User (zkLogin), admin-sponsored | Update stats. The admin Ed25519-signs the values (verified on-chain); the reader signs the transaction. Totals are monotonic (replay-protected). |
| `set_blob_id(cap, passport, blob_id, ctx)` | NestJS | Anchor a Walrus BlobId for the identity snapshot. Overwrites on repeat calls. |

> The legacy `update_stats(cap, passport, ...)` is retained for compatibility but is **uncallable in production** — it needs the AdminCap and a user-owned passport in one transaction, which no single sender can provide. Use `update_stats_attested`.

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
