/// Arktion – Series Badges Module
///
/// Soul-bound achievement badges awarded per series. A badge proves a reader's
/// engagement depth with a specific series — Initiate through Legend tier.
///
/// Metadata (badge image, description) lives on Walrus. The metadata_blob_id
/// field anchors the badge to its visual identity on-chain, so badge art survives
/// any server outage. NestJS must upload to Walrus and obtain a BlobId before
/// calling mint — the BlobId is required at creation, not optional.
///
/// Soul-bound: no transfer function. The Move type system makes unauthorized
/// transfer impossible — a `key`-only struct with no `store` cannot be passed
/// to transfer::public_transfer by any external caller.
module arktion::series_badges;

use arktion::admin::AdminCap;
use std::string::String;
use sui::event;

// These are kept as documentation for NestJS callers that map badge type codes.
#[allow(unused_const)]
const INITIATE: u8 = 0;
#[allow(unused_const)]
const SCHOLAR: u8 = 1;
#[allow(unused_const)]
const VETERAN: u8 = 2;
#[allow(unused_const)]
const ELDER: u8 = 3;
const LEGEND: u8 = 4;

/// badge_type is outside the range 0–4 (INITIATE through LEGEND).
const EInvalidBadgeType: u64 = 0;

/// Soul-bound achievement badge tied to a specific series.
/// `key` only (no `store`) — cannot be transferred or wrapped by external callers.
public struct SeriesBadge has key {
    id: UID,
    owner: address,
    series_id: String,
    badge_type: u8,
    tier: u8,
    awarded_at: u64,
    /// Walrus BlobId containing badge image and description JSON.
    /// Required at mint — badge art must exist on Walrus before the badge is issued.
    metadata_blob_id: vector<u8>,
}

public struct BadgeMinted has copy, drop {
    recipient: address,
    series_id: String,
    badge_type: u8,
    tier: u8,
}

/// Mint a soul-bound badge and transfer it to `recipient`.
/// NestJS must upload badge metadata to Walrus and pass the resulting BlobId here.
public fun mint(
    _cap: &AdminCap,
    recipient: address,
    series_id: String,
    badge_type: u8,
    tier: u8,
    metadata_blob_id: vector<u8>,
    ctx: &mut TxContext,
) {
    assert!(badge_type <= LEGEND, EInvalidBadgeType);

    let badge = SeriesBadge {
        id: object::new(ctx),
        owner: recipient,
        series_id,
        badge_type,
        tier,
        awarded_at: ctx.epoch_timestamp_ms(),
        metadata_blob_id,
    };

    event::emit(BadgeMinted {
        recipient,
        series_id,
        badge_type,
        tier,
    });

    transfer::transfer(badge, recipient);
}

/// Returns the Walrus BlobId anchored to this badge so tests can verify it is
/// stored correctly at mint time. Not part of the production API.
#[test_only]
public fun metadata_blob_id_for_testing(badge: &SeriesBadge): vector<u8> {
    badge.metadata_blob_id
}
