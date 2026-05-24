module arktion::passport;

use arktion::admin::AdminCap;
use std::string::{Self, String};
use sui::event;

// ===== Structs =====

public struct ArktionPassport has key {
    id: UID,
    owner: address,
    level: u64,
    total_ink_earned: u64,
    chapters_read: u64,
    series_completed: u64,
    series_tracked: u64,
    identity_snapshot_blob_id: Option<vector<u8>>,
    created_at: u64,
}

// ===== Events =====

public struct PassportMinted has copy, drop {
    object_id: ID,
    owner: address,
}

public struct StatsUpdated has copy, drop {
    object_id: ID,
    owner: address,
    chapters_read: u64,
    series_completed: u64,
    series_tracked: u64,
}

public struct BlobIdSet has copy, drop {
    object_id: ID,
    owner: address,
}

// ===== Public view functions =====

public fun owner(passport: &ArktionPassport): address {
    passport.owner
}

public fun level(passport: &ArktionPassport): u64 {
    passport.level
}

public fun total_ink_earned(passport: &ArktionPassport): u64 {
    passport.total_ink_earned
}

public fun chapters_read(passport: &ArktionPassport): u64 {
    passport.chapters_read
}

public fun series_completed(passport: &ArktionPassport): u64 {
    passport.series_completed
}

public fun series_tracked(passport: &ArktionPassport): u64 {
    passport.series_tracked
}

public fun identity_snapshot_blob_id(passport: &ArktionPassport): &Option<vector<u8>> {
    &passport.identity_snapshot_blob_id
}

// ===== Entrypoints =====

/// Mint a new passport - only callable by PassportCap holder (NestJS wallet)
public fun mint(_cap: &AdminCap, recipient: address, ctx: &mut TxContext) {
    let passport = ArktionPassport {
        id: object::new(ctx),
        owner: recipient,
        level: 1,
        total_ink_earned: 0,
        chapters_read: 0,
        series_completed: 0,
        series_tracked: 0,
        identity_snapshot_blob_id: option::none(),
        created_at: ctx.epoch_timestamp_ms(),
    };

    event::emit(PassportMinted {
        object_id: object::id(&passport),
        owner: recipient,
    });

    transfer::transfer(passport, recipient);
}

/// Update reading stats - only callable by NestJS via AdminCap, which is only held by NestJS wallet
public fun update_stats(
    _cap: &AdminCap,
    passport: &mut ArktionPassport,
    chapters_read: u64,
    series_completed: u64,
    series_tracked: u64,
    total_ink_earned: u64,
) {
    passport.chapters_read = chapters_read;
    passport.series_completed = series_completed;
    passport.series_tracked = series_tracked;
    passport.total_ink_earned = total_ink_earned;
    passport.level = calculate_level(total_ink_earned);

    event::emit(StatsUpdated {
        object_id: object::id(passport),
        owner: passport.owner,
        chapters_read,
        series_completed,
        series_tracked,
    });
}

/// Set Walrus blob ID for reading history snapshot
public fun set_blob_id(
    _cap: &AdminCap,
    passport: &mut ArktionPassport,
    blob_id: vector<u8>,
    _ctx: &mut TxContext,
) {
    passport.identity_snapshot_blob_id = option::some(blob_id);

    event::emit(BlobIdSet {
        object_id: object::id(passport),
        owner: passport.owner,
    });
}

// ===== Internal =====

/// Calculate level based on lifetime INK earned
/// Matches the level thresholds in the PRD
fun calculate_level(total_ink_earned: u64): u64 {
    if (total_ink_earned >= 40000) { 6 } else if (total_ink_earned >= 15000) { 5 } else if (
        total_ink_earned >= 6000
    ) { 4 } else if (total_ink_earned >= 2000) { 3 } else if (total_ink_earned >= 500) { 2 } else {
        1
    }
}

// NOTE: No transfer function = soul-bound
// PassportCap holder is the only one who can modify passport data
