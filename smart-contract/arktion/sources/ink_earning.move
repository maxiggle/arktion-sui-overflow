/// Arktion – INK Earning Module
///
/// Single chokepoint for all INK minting. Nothing mints INK except this module.
/// Every earn event is idempotent: NestJS generates a UUID idempotency key per
/// event (chapter read, series completion, submission approval) and this module
/// permanently records it in EarningRegistry dynamic fields. Replaying the same
/// key aborts with EDuplicateIdempotencyKey.
///
/// On-chain audit trail: every successful earn creates an EarningRecord owned by
/// the user, giving them a verifiable history of how they earned their INK.
module arktion::ink_earning;

use arktion::admin::AdminCap;
use arktion::ink::{Self, INK};
use std::string::String;
use sui::coin::TreasuryCap;
use sui::dynamic_field;
use sui::event;

const CHAPTER_READ: u8 = 0;
const SERIES_COMPLETE: u8 = 1;
const SUBMISSION_APPROVED: u8 = 2;

const CHAPTER_READ_AMOUNT: u64 = 10;
const SERIES_COMPLETE_AMOUNT: u64 = 100;
const SUBMISSION_APPROVED_AMOUNT: u64 = 50;

/// trigger_type is not one of the three defined constants.
const EInvalidTriggerType: u64 = 0;
/// This idempotency_key has already been processed — replay attempt blocked.
const EDuplicateIdempotencyKey: u64 = 1;

/// On-chain audit record sent to the user after each successful earn.
/// Gives users verifiable proof of every INK they received and why.
public struct EarningRecord has key {
    id: UID,
    idempotency_key: String,
    user: address,
    trigger_type: u8,
    amount: u64,
    earned_at: u64,
}

/// Shared object that stores every processed idempotency key as a dynamic field.
/// Dynamic field schema: String (idempotency_key) → bool (always true)
/// The key's mere existence in the field table is the lock.
public struct EarningRegistry has key {
    id: UID,
}

public struct InkEarned has copy, drop {
    user: address,
    trigger_type: u8,
    amount: u64,
    idempotency_key: String,
}

/// Shares the EarningRegistry at publish time. Must exist before any earn() call.
fun init(ctx: &mut TxContext) {
    let registry = EarningRegistry { id: object::new(ctx) };
    transfer::share_object(registry);
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

/// Mint INK for a user in exchange for a qualifying platform action.
///
/// Flow:
///   1. Validate trigger_type is known.
///   2. Check idempotency_key has never been used (aborts if duplicate).
///   3. Lock the key permanently in EarningRegistry.
///   4. Compute amount, mint INK via arktion::ink::mint.
///   5. Create EarningRecord for the user.
///   6. Emit InkEarned for NestJS event listeners.
///
/// The idempotency check happens before minting (step 3 before step 4) so that
/// a failed mint cannot leave a locked key with no corresponding coins issued.
public fun earn(
    cap: &AdminCap,
    treasury: &mut TreasuryCap<INK>,
    registry: &mut EarningRegistry,
    user_address: address,
    trigger_type: u8,
    idempotency_key: String,
    ctx: &mut TxContext,
) {
    assert!(trigger_type <= SUBMISSION_APPROVED, EInvalidTriggerType);
    assert!(!dynamic_field::exists(&registry.id, idempotency_key), EDuplicateIdempotencyKey);

    let amount = get_amount_for_trigger(trigger_type);

    // Lock key before minting — any abort after this point means the key is
    // consumed and the transaction rolls back atomically, so no partial state.
    dynamic_field::add(&mut registry.id, idempotency_key, true);

    ink::mint(cap, treasury, amount, user_address, ctx);

    let record = EarningRecord {
        id: object::new(ctx),
        idempotency_key,
        user: user_address,
        trigger_type,
        amount,
        earned_at: ctx.epoch_timestamp_ms(),
    };
    transfer::transfer(record, user_address);

    event::emit(InkEarned {
        user: user_address,
        trigger_type,
        amount,
        idempotency_key,
    });
}

fun get_amount_for_trigger(trigger_type: u8): u64 {
    if (trigger_type == CHAPTER_READ) {
        CHAPTER_READ_AMOUNT
    } else if (trigger_type == SERIES_COMPLETE) {
        SERIES_COMPLETE_AMOUNT
    } else if (trigger_type == SUBMISSION_APPROVED) {
        SUBMISSION_APPROVED_AMOUNT
    } else {
        abort EInvalidTriggerType
    }
}

public fun trigger_chapter_read(): u8 { CHAPTER_READ }

public fun trigger_series_complete(): u8 { SERIES_COMPLETE }

public fun trigger_submission_approved(): u8 { SUBMISSION_APPROVED }
