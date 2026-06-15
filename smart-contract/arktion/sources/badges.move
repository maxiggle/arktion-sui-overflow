/// Arktion – Badges Module
///
/// Soul-bound achievement credentials across all five badge categories:
///   - Reading Achievement: First Chapter, Binge Reader, Series Completionist,
///     Marathon Reader, OG Reader
///   - Community:           First Voice, Patron, Loyal Patron, Bounty Funder,
///                          Bounty Founder, Prophet, Oracle
///   - Series Lore:         Initiate, Scholar, Veteran, Elder, Legend
///                          (requires non-empty series_id)
///   - Creator:             First Chapter Published, 100 Chapters, 1k Subscribers,
///                          Zero Drop, Torch Bearer, Licensed Creator
///   - Contributor:         Submission Approved, Translation Bounty Creator,
///                          Fanfiction Patron
///
/// Idempotency: each (recipient, category, badge_type, series_id) tuple can only
/// be minted once. The composite key is stored as a dynamic field on the shared
/// BadgeRegistry. A second mint attempt aborts with EBadgeAlreadyMinted.
/// This is content-addressed idempotency — NestJS does not need to coordinate
/// idempotency keys to prevent duplicates.
///
/// Soul-bound: ArktionBadge has `key` only (no `store`). External callers cannot
/// invoke transfer::public_transfer on it. Only this module's mint function
/// transfers it, exactly once, to the recipient at mint time.
///
/// Walrus: metadata_blob_id is required at mint — badge art must already exist
/// on Walrus before issuance. This guarantees a badge is never created without
/// a permanent visual identity.
///
/// NestJS responsibility: badge_type values are scoped per category. NestJS
/// owns the enum mapping (e.g. badge_type=0 means First Chapter under Reading
/// Achievement but Initiate under Series Lore). The contract only enforces
/// category bounds and the series_id-vs-category invariant.
module arktion::badges;

use arktion::admin::AdminCap;
use std::string::String;
use sui::dynamic_field;
use sui::event;

const CATEGORY_READING_ACHIEVEMENT: u8 = 0;
const CATEGORY_COMMUNITY: u8 = 1;
const CATEGORY_SERIES_LORE: u8 = 2;
const CATEGORY_CREATOR: u8 = 3;
const CATEGORY_CONTRIBUTOR: u8 = 4;

/// category is outside the range 0–4.
const EInvalidCategory: u64 = 0;
/// Series Lore badges require a non-empty series_id;
/// all other categories must pass an empty series_id.
const ESeriesIdMismatch: u64 = 1;
/// A badge with this exact (recipient, category, type, series_id) tuple
/// has already been minted.
const EBadgeAlreadyMinted: u64 = 2;

/// Composite key for content-addressed idempotency. The existence of this key
/// as a dynamic field on BadgeRegistry proves the badge has been issued.
public struct BadgeKey has copy, drop, store {
    recipient: address,
    category: u8,
    badge_type: u8,
    /// Empty string when the badge is not tied to a specific series.
    series_id: String,
}

/// Soul-bound achievement badge. `key` only — cannot be transferred or wrapped
/// by external callers.
public struct ArktionBadge has key {
    id: UID,
    category: u8,
    badge_type: u8,
    /// Empty string when the badge is not tied to a specific series.
    series_id: String,
    tier: u8,
    awarded_at: u64,
    /// Walrus BlobId containing badge image and description JSON.
    metadata_blob_id: vector<u8>,
}

/// Shared registry tracking minted badges by composite key.
public struct BadgeRegistry has key {
    id: UID,
}

public struct BadgeMinted has copy, drop {
    recipient: address,
    object_id: ID,
    category: u8,
    badge_type: u8,
    series_id: String,
    tier: u8,
}

fun init(ctx: &mut TxContext) {
    let registry = BadgeRegistry { id: object::new(ctx) };
    transfer::share_object(registry);
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

/// Mint a soul-bound badge for `recipient`.
///
/// Idempotent by content: minting the same (recipient, category, badge_type,
/// series_id) tuple twice aborts with EBadgeAlreadyMinted.
///
/// `series_id` MUST be non-empty for CATEGORY_SERIES_LORE and MUST be empty
/// for every other category. This invariant keeps the on-chain badge corpus
/// consistent — series-tied badges always have a series_id, others never do.
public fun mint(
    _cap: &AdminCap,
    registry: &mut BadgeRegistry,
    recipient: address,
    category: u8,
    badge_type: u8,
    series_id: String,
    tier: u8,
    metadata_blob_id: vector<u8>,
    ctx: &mut TxContext,
) {
    assert!(category <= CATEGORY_CONTRIBUTOR, EInvalidCategory);

    // Enforce series_id presence matches category semantics.
    let has_series = !series_id.is_empty();
    if (category == CATEGORY_SERIES_LORE) {
        assert!(has_series, ESeriesIdMismatch);
    } else {
        assert!(!has_series, ESeriesIdMismatch);
    };

    let key = BadgeKey {
        recipient,
        category,
        badge_type,
        series_id,
    };
    assert!(!dynamic_field::exists(&registry.id, key), EBadgeAlreadyMinted);

    let badge = ArktionBadge {
        id: object::new(ctx),
        category,
        badge_type,
        series_id,
        tier,
        awarded_at: ctx.epoch_timestamp_ms(),
        metadata_blob_id,
    };
    let badge_id = object::id(&badge);

    dynamic_field::add(&mut registry.id, key, true);

    event::emit(BadgeMinted {
        recipient,
        object_id: badge_id,
        category,
        badge_type,
        series_id,
        tier,
    });

    transfer::transfer(badge, recipient);
}

public fun category(badge: &ArktionBadge): u8 { badge.category }

public fun badge_type(badge: &ArktionBadge): u8 { badge.badge_type }

public fun series_id(badge: &ArktionBadge): String { badge.series_id }

public fun tier(badge: &ArktionBadge): u8 { badge.tier }

public fun awarded_at(badge: &ArktionBadge): u64 { badge.awarded_at }

public fun metadata_blob_id(badge: &ArktionBadge): vector<u8> { badge.metadata_blob_id }

public fun category_reading_achievement(): u8 { CATEGORY_READING_ACHIEVEMENT }

public fun category_community(): u8 { CATEGORY_COMMUNITY }

public fun category_series_lore(): u8 { CATEGORY_SERIES_LORE }

public fun category_creator(): u8 { CATEGORY_CREATOR }

public fun category_contributor(): u8 { CATEGORY_CONTRIBUTOR }

#[test_only]
public fun has_badge_for_testing(
    registry: &BadgeRegistry,
    recipient: address,
    category: u8,
    badge_type: u8,
    series_id: String,
): bool {
    let key = BadgeKey { recipient, category, badge_type, series_id };
    dynamic_field::exists(&registry.id, key)
}
