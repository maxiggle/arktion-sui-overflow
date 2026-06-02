/// Arktion – Submission Module
///
/// Community series suggestion registry. Users propose series they want on
/// Arktion; admins approve or reject. Approved submissions allow the submitter
/// to claim an INK reward and a soul-bound Contributor badge in one atomic
/// transaction.
///
/// Submissions are shared objects so admins (NestJS) can transition their state
/// without requiring the submitter to co-sign approval transactions. This
/// trade-off — consensus latency for governance simplicity — is acceptable
/// because submissions are low-frequency.
///
/// Reward claiming routes through:
///   - arktion::ink_earning::earn for the INK payout (50 INK, idempotency-keyed)
///   - arktion::badges::mint for the Contributor badge (composite-key idempotent)
///   - submission.reward_claimed as the on-chain backstop
///
/// All three guards must agree before disbursement. Any single failure rolls
/// back the entire claim_reward transaction.
module arktion::submission;

use arktion::admin::AdminCap;
use arktion::badges::{Self, BadgeRegistry};
use arktion::ink::INK;
use arktion::ink_earning::{Self, EarningRegistry};
use std::string::String;
use sui::coin::TreasuryCap;
use sui::event;

// ===== Status constants =====

const STATUS_PENDING: u8 = 0;
const STATUS_APPROVED: u8 = 1;
const STATUS_REJECTED: u8 = 2;

// ===== Format constants (mirror journal.move) =====

#[allow(unused_const)]
const FORMAT_NOVEL: u8 = 0;
#[allow(unused_const)]
const FORMAT_MANGA: u8 = 1;
#[allow(unused_const)]
const FORMAT_MANHWA: u8 = 2;
#[allow(unused_const)]
const FORMAT_MANHUA: u8 = 3;
const FORMAT_WEBTOON: u8 = 4;

// ===== Badge constants =====

/// Contributor badge subtype awarded on submission approval.
const CONTRIBUTOR_SUBMISSION_APPROVED: u8 = 0;

/// Trigger code matching arktion::ink_earning::SUBMISSION_APPROVED.
const TRIGGER_SUBMISSION_APPROVED: u8 = 2;

// ===== Error codes =====

/// format_type is outside the range 0–4.
const EInvalidFormat: u64 = 0;
/// Submission is not in PENDING state — cannot approve/reject.
const ENotPending: u64 = 1;
/// Submission is not in APPROVED state — cannot claim reward.
const ENotApproved: u64 = 2;
/// Reward has already been claimed for this submission.
const EAlreadyClaimed: u64 = 3;

// ===== Structs =====

/// Community submission. Shared so admins can mutate without submitter co-sign.
public struct Submission has key {
    id: UID,
    submitter: address,
    title: String,
    format_type: u8,
    external_url: String,
    suggested_source: String,
    status: u8,
    reviewed_at: Option<u64>,
    reward_claimed: bool,
    created_at: u64,
}

// ===== Events =====

public struct SubmissionCreated has copy, drop {
    object_id: ID,
    submitter: address,
    title: String,
    format_type: u8,
}

public struct SubmissionApproved has copy, drop {
    object_id: ID,
    submitter: address,
    approved_by: address,
}

public struct SubmissionRejected has copy, drop {
    object_id: ID,
    submitter: address,
    rejected_by: address,
}

public struct RewardClaimed has copy, drop {
    object_id: ID,
    submitter: address,
}

// ===== Write functions =====

/// Create a new submission. Called by the submitter directly — NestJS builds
/// the PTB, the submitter signs via zkLogin. No AdminCap required: any user
/// can suggest a series.
///
/// The submission is shared so admins can later approve or reject it.
public fun create(
    title: String,
    format_type: u8,
    external_url: String,
    suggested_source: String,
    ctx: &mut TxContext,
) {
    assert!(format_type <= FORMAT_WEBTOON, EInvalidFormat);

    let submitter = ctx.sender();
    let submission = Submission {
        id: object::new(ctx),
        submitter,
        title,
        format_type,
        external_url,
        suggested_source,
        status: STATUS_PENDING,
        reviewed_at: option::none(),
        reward_claimed: false,
        created_at: ctx.epoch_timestamp_ms(),
    };

    event::emit(SubmissionCreated {
        object_id: object::id(&submission),
        submitter,
        title,
        format_type,
    });

    transfer::share_object(submission);
}

/// Approve a pending submission. AdminCap-gated.
public fun approve(_cap: &AdminCap, submission: &mut Submission, ctx: &TxContext) {
    assert!(submission.status == STATUS_PENDING, ENotPending);

    submission.status = STATUS_APPROVED;
    submission.reviewed_at = option::some(ctx.epoch_timestamp_ms());

    event::emit(SubmissionApproved {
        object_id: object::id(submission),
        submitter: submission.submitter,
        approved_by: ctx.sender(),
    });
}

/// Reject a pending submission. AdminCap-gated.
public fun reject(_cap: &AdminCap, submission: &mut Submission, ctx: &TxContext) {
    assert!(submission.status == STATUS_PENDING, ENotPending);

    submission.status = STATUS_REJECTED;
    submission.reviewed_at = option::some(ctx.epoch_timestamp_ms());

    event::emit(SubmissionRejected {
        object_id: object::id(submission),
        submitter: submission.submitter,
        rejected_by: ctx.sender(),
    });
}

/// Atomic claim: mint INK reward + Contributor badge for an approved submission.
///
/// Guards (any one fails → whole transaction rolls back):
///   - submission.status must be APPROVED
///   - submission.reward_claimed must be false
///   - ink_earning idempotency_key must be fresh
///   - badges composite key (recipient, contributor, submission_approved, "")
///     must not already exist
///
/// reward_claimed is set BEFORE downstream calls so that Move's atomic abort
/// guarantees rollback on any failure leaves no partial state.
public fun claim_reward(
    cap: &AdminCap,
    treasury: &mut TreasuryCap<INK>,
    earning_registry: &mut EarningRegistry,
    badge_registry: &mut BadgeRegistry,
    submission: &mut Submission,
    idempotency_key: String,
    badge_metadata_blob_id: vector<u8>,
    ctx: &mut TxContext,
) {
    assert!(submission.status == STATUS_APPROVED, ENotApproved);
    assert!(!submission.reward_claimed, EAlreadyClaimed);

    submission.reward_claimed = true;

    // Mint 50 INK via the central earning module.
    ink_earning::earn(
        cap,
        treasury,
        earning_registry,
        submission.submitter,
        TRIGGER_SUBMISSION_APPROVED,
        idempotency_key,
        ctx,
    );

    // Mint the Contributor badge. Empty series_id is required for non-Series-Lore
    // categories per badges.move invariants.
    badges::mint(
        cap,
        badge_registry,
        submission.submitter,
        badges::category_contributor(),
        CONTRIBUTOR_SUBMISSION_APPROVED,
        b"".to_string(),
        0, // tier — non-tiered contributor badge
        badge_metadata_blob_id,
        ctx,
    );

    event::emit(RewardClaimed {
        object_id: object::id(submission),
        submitter: submission.submitter,
    });
}

// ===== Read-only accessors =====

public fun submitter(s: &Submission): address { s.submitter }

public fun title(s: &Submission): String { s.title }

public fun format_type(s: &Submission): u8 { s.format_type }

public fun external_url(s: &Submission): String { s.external_url }

public fun suggested_source(s: &Submission): String { s.suggested_source }

public fun status(s: &Submission): u8 { s.status }

public fun reviewed_at(s: &Submission): Option<u64> { s.reviewed_at }

public fun reward_claimed(s: &Submission): bool { s.reward_claimed }

public fun created_at(s: &Submission): u64 { s.created_at }

public fun status_pending(): u8 { STATUS_PENDING }

public fun status_approved(): u8 { STATUS_APPROVED }

public fun status_rejected(): u8 { STATUS_REJECTED }
