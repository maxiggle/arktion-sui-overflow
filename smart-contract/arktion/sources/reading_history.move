/// Arktion – Reading History Module
///
/// Tracks what a user is currently reading on the Arktion platform.
/// Postgres is the authoritative source for fast queries; this module is the
/// ownership anchor — users have on-chain proof of their reading state.
///
/// Each user gets one UserLibrary. Series are stored as dynamic fields keyed by
/// series_id (String), allowing an unbounded number of tracked series without
/// resizing a fixed array. Upsert semantics: NestJS sends the full current state
/// for a series on every update; the module overwrites or creates as needed.
///
/// Old records are archived to Walrus by NestJS; the Walrus BlobId is stored in
/// history_blob_id so the archive is discoverable on-chain.
module arktion::reading_history;

use arktion::admin::AdminCap;
use sui::dynamic_field;
use sui::event;
use std::string::String;

// ===== Status constants =====

// These are kept as documentation for NestJS callers that map status codes.
#[allow(unused_const)]
const STATUS_READING: u8 = 0;
const STATUS_COMPLETED: u8 = 1;
#[allow(unused_const)]
const STATUS_ON_HOLD: u8 = 2;
#[allow(unused_const)]
const STATUS_DROPPED: u8 = 3;
const STATUS_PLAN_TO_READ: u8 = 4;

// ===== Error codes =====

/// status value is outside the range 0–4.
const EInvalidStatus: u64 = 0;
/// Caller is not the owner of this library.
const ENotOwner: u64 = 1;

// ===== Structs =====

/// One per user. Owns all ReadingRecord dynamic fields for that user.
public struct UserLibrary has key {
    id: UID,
    owner: address,
    /// Walrus BlobId for archived reading history. Set by NestJS when old records
    /// are pruned from chain and written to cold storage.
    history_blob_id: option::Option<vector<u8>>,
}

/// Stored as a dynamic field inside UserLibrary, keyed by series_id.
/// Has `store` (not `key`) — lives inside the parent object, not as a top-level object.
public struct ReadingRecord has store {
    series_id: String,
    status: u8,
    current_chapter: u64,
    last_read_at: u64,
    completed_at: option::Option<u64>,
}

// ===== Events =====

public struct ReadingUpdated has copy, drop {
    owner: address,
    series_id: String,
    status: u8,
    current_chapter: u64,
}

public struct HistoryArchived has copy, drop {
    owner: address,
    blob_id: vector<u8>,
}

// ===== Write functions =====

/// Create a new UserLibrary for `recipient`.
/// Called by NestJS the first time a user signs in.
public fun create_library(_cap: &AdminCap, recipient: address, ctx: &mut TxContext) {
    let library = UserLibrary {
        id: object::new(ctx),
        owner: recipient,
        history_blob_id: option::none(),
    };
    transfer::transfer(library, recipient);
}

/// Upsert a ReadingRecord for `series_id` in `library`.
/// Called by the user — they own their reading state. NestJS constructs
/// the PTB and the user signs it via zkLogin.
/// completed_at is set once, the first time status transitions to COMPLETED.
public fun add_or_update_record(
    library: &mut UserLibrary,
    series_id: String,
    status: u8,
    current_chapter: u64,
    ctx: &TxContext,
) {
    assert!(ctx.sender() == library.owner, ENotOwner);
    assert!(status <= STATUS_PLAN_TO_READ, EInvalidStatus);

    let now = ctx.epoch_timestamp_ms();

    if (dynamic_field::exists(&library.id, series_id)) {
        let record = dynamic_field::borrow_mut<String, ReadingRecord>(&mut library.id, series_id);
        record.status = status;
        record.current_chapter = current_chapter;
        record.last_read_at = now;
        if (status == STATUS_COMPLETED && record.completed_at.is_none()) {
            record.completed_at = option::some(now);
        };
    } else {
        let completed_at = if (status == STATUS_COMPLETED) {
            option::some(now)
        } else {
            option::none()
        };
        dynamic_field::add(&mut library.id, series_id, ReadingRecord {
            series_id,
            status,
            current_chapter,
            last_read_at: now,
            completed_at,
        });
    };

    event::emit(ReadingUpdated {
        owner: library.owner,
        series_id,
        status,
        current_chapter,
    });
}

// ===== Test helpers =====

/// Exposes completed_at for a series record so tests can verify it is set once
/// and never overwritten. Not part of the production API.
#[test_only]
public fun completed_at_for_testing(library: &UserLibrary, series_id: String): Option<u64> {
    let record = dynamic_field::borrow<String, ReadingRecord>(&library.id, series_id);
    record.completed_at
}

/// Store a Walrus BlobId pointing to archived reading history.
/// NestJS calls this after writing old records to Walrus cold storage.
public fun set_history_blob(
    _cap: &AdminCap,
    library: &mut UserLibrary,
    blob_id: vector<u8>,
    _ctx: &TxContext,
) {
    library.history_blob_id = option::some(blob_id);

    event::emit(HistoryArchived {
        owner: library.owner,
        blob_id,
    });
}
