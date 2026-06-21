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
use sui::bcs;
use sui::display;
use sui::ed25519;
use sui::event;
use sui::package;

/// Sender is not the passport's owner.
const E_NOT_OWNER: u64 = 1;
/// Ed25519 signature did not verify against the configured admin public key.
const E_BAD_SIG: u64 = 2;
/// Submitted total_ink_earned is below the stored value — a stale/replayed payload.
const E_STALE_UPDATE: u64 = 3;

public struct PASSPORT has drop {}

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

fun init(otw: PASSPORT, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);
    let mut display = display::new<ArktionPassport>(&publisher, ctx);

    display.add(b"name".to_string(), b"Arktion Passport".to_string());
    display.add(
        b"description".to_string(),
        b"Soul-bound reading identity on Sui. Level {level} \xc2\xb7 {chapters_read} chapters read.".to_string(),
    );
    display.add(
        b"image_url".to_string(),
        b"https://api.arktion.app/passport/{owner}/image.svg".to_string(),
    );
    display.add(b"project_url".to_string(), b"https://arktion.app".to_string());
    display.add(b"creator".to_string(), b"Arktion".to_string());

    display.update_version();
    transfer::public_transfer(display, ctx.sender());
    transfer::public_transfer(publisher, ctx.sender());
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

/// Holds the backend admin's 32-byte Ed25519 public key. Shared so that the
/// owner-submitted `update_stats_attested` path can verify the admin's signature
/// over a stats payload without putting an AdminCap into the transaction.
public struct PassportConfig has key {
    id: UID,
    admin_pubkey: vector<u8>,
}

/// BCS serialization of this struct IS the exact message the backend admin signs.
/// Field order is the wire contract shared with NestJS — do not reorder.
public struct StatsAttestation has copy, drop {
    passport_id: ID,
    chapters_read: u64,
    series_completed: u64,
    series_tracked: u64,
    total_ink_earned: u64,
}

/// One-time post-upgrade setup: create and share the PassportConfig holding the
/// backend admin's Ed25519 public key. `init` does not re-run on upgrade, so the
/// config must be created through this admin-gated entry instead.
public entry fun init_passport_config(
    _cap: &AdminCap,
    admin_pubkey: vector<u8>,
    ctx: &mut TxContext,
) {
    assert!(admin_pubkey.length() == 32, E_BAD_SIG);
    transfer::share_object(PassportConfig {
        id: object::new(ctx),
        admin_pubkey,
    });
}

/// Owner-submitted stats update, attested by the backend admin's Ed25519 signature.
///
/// Unlike `update_stats` (which is uncallable in production — admin owns the
/// AdminCap, user owns the passport, and a single transaction's owned inputs must
/// all belong to the sender), this is signed by the passport's own wallet. The
/// admin only sponsors gas. Trust comes from the admin's signature over the
/// payload rather than from holding the AdminCap.
///
/// BACKEND INTERFACE CONTRACT — the admin signs the BCS serialization of
/// `StatsAttestation`, i.e. exactly these 64 bytes:
///   bytes[ 0..32] = passport object id   (32 raw bytes == ID inner address, no length prefix)
///   bytes[32..40] = chapters_read         (u64, little-endian)
///   bytes[40..48] = series_completed      (u64, little-endian)
///   bytes[48..56] = series_tracked        (u64, little-endian)
///   bytes[56..64] = total_ink_earned      (u64, little-endian)
/// TS: `Ed25519Keypair.sign(messageBytes)` -> 64-byte signature; the stored
/// `admin_pubkey` is `getPublicKey().toRawBytes()` (32 bytes). The canonical
/// reference implementation is scripts/sign-passport-stats.ts.
public entry fun update_stats_attested(
    config: &PassportConfig,
    passport: &mut ArktionPassport,
    chapters_read: u64,
    series_completed: u64,
    series_tracked: u64,
    total_ink_earned: u64,
    signature: vector<u8>,
    ctx: &TxContext,
) {
    assert!(passport.owner == ctx.sender(), E_NOT_OWNER);

    let message = bcs::to_bytes(&StatsAttestation {
        passport_id: object::id(passport),
        chapters_read,
        series_completed,
        series_tracked,
        total_ink_earned,
    });
    assert!(ed25519::ed25519_verify(&signature, &config.admin_pubkey, &message), E_BAD_SIG);

    // Replay/rollback protection without adding a field: lifetime INK is monotonic
    // non-decreasing, so a payload below the stored total is stale.
    assert!(total_ink_earned >= passport.total_ink_earned, E_STALE_UPDATE);

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
