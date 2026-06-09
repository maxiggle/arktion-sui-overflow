/// Arktion – Passport Module
///
/// Soul-bound on-chain reading identity. One ArktionPassport per user, minted
/// at first sign-in. Aggregate stats (chapters_read, series_completed,
/// series_tracked, total_ink_earned) are kept in sync by NestJS, which is the
/// authoritative source. The passport is the ownership anchor.
///
/// Soul-bound: ArktionPassport has `key` only (no `store`). External callers
/// cannot move it via transfer::public_transfer; the only transfer happens
/// inside `mint`, exactly once, at issuance.
///
/// Walrus: identity_snapshot_blob_id optionally anchors a full reading history
/// export. Populated on demand via `set_blob_id`.
module arktion::passport;

use arktion::admin::AdminCap;
use sui::event;

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

public struct PassportMinted has copy, drop {
    object_id: ID,
    owner: address,
}

/// Emitted on every stats update. Includes the new computed level and
/// total_ink_earned so listeners do not need to re-query the passport object
/// to detect a level-up.
public struct StatsUpdated has copy, drop {
    object_id: ID,
    owner: address,
    chapters_read: u64,
    series_completed: u64,
    series_tracked: u64,
    total_ink_earned: u64,
    level: u64,
}

public struct BlobIdSet has copy, drop {
    object_id: ID,
    owner: address,
}

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

/// Mint a new passport. Only callable by AdminCap holder (NestJS wallet).
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

/// Overwrite reading stats with the latest absolute totals from Postgres.
/// NestJS is responsible for reading the current passport state before
/// computing new totals — race conditions otherwise drop updates.
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
        total_ink_earned,
        level: passport.level,
    });
}

/// Set Walrus blob ID for reading history snapshot.
public fun set_blob_id(
    _cap: &AdminCap,
    passport: &mut ArktionPassport,
    blob_id: vector<u8>,
) {
    passport.identity_snapshot_blob_id = option::some(blob_id);

    event::emit(BlobIdSet {
        object_id: object::id(passport),
        owner: passport.owner,
    });
}

/// Calculate level based on lifetime INK earned. Thresholds mirror brief §5.
fun calculate_level(total_ink_earned: u64): u64 {
    if (total_ink_earned >= 40000) { 6 }
    else if (total_ink_earned >= 15000) { 5 }
    else if (total_ink_earned >= 6000) { 4 }
    else if (total_ink_earned >= 2000) { 3 }
    else if (total_ink_earned >= 500) { 2 }
    else { 1 }
}
