#[test_only]
module arktion::arktion_tests;

use arktion::admin::{Self, AdminCap, AdminRegistry};
use arktion::passport::{Self, ArktionPassport};
use arktion::ink::{Self, INK};
use arktion::ink_earning::{Self, EarningRegistry, EarningRecord};
use arktion::reading_history::{Self, UserLibrary};
use arktion::journal::{Self, UserJournal};
use arktion::series_badges::{Self, SeriesBadge};
use sui::coin::{Coin, TreasuryCap};
use sui::test_scenario;

// ─── Test addresses ──────────────────────────────────────────────────────────

const ADMIN: address = @0xAD;
const USER: address = @0xBEEF;

// ─── Shared setup helpers ─────────────────────────────────────────────────────

/// Init admin + ink + ink_earning in a single transaction.
/// Call this inside the first {} block of a scenario, then advance with next_tx.
fun setup_ink_earn(scenario: &mut test_scenario::Scenario) {
    admin::init_for_testing(scenario.ctx());
    ink::init_for_testing(scenario.ctx());
    ink_earning::init_for_testing(scenario.ctx());
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN MODULE
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_admin_init_creates_cap_and_registry() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let registry = s.take_shared<AdminRegistry>();
        assert!(admin::is_admin(&registry, ADMIN));
        assert!(admin::get_admins(&registry).length() == 1);
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test]
fun test_admin_grant_adds_to_registry() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut registry = s.take_shared<AdminRegistry>();
        admin::grant(&cap, USER, &mut registry, s.ctx());
        assert!(admin::is_admin(&registry, USER));
        assert!(admin::get_admins(&registry).length() == 2);
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test]
fun test_admin_revoke_removes_from_registry() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut registry = s.take_shared<AdminRegistry>();
        admin::grant(&cap, USER, &mut registry, s.ctx());
        admin::revoke(&cap, &mut registry, USER, s.ctx());
        assert!(!admin::is_admin(&registry, USER));
        assert!(admin::get_admins(&registry).length() == 1);
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::admin::EAlreadyAdmin)]
fun test_admin_grant_duplicate_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut registry = s.take_shared<AdminRegistry>();
        // ADMIN is already in the registry from init
        admin::grant(&cap, ADMIN, &mut registry, s.ctx());
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::admin::ENotAdmin)]
fun test_admin_revoke_nonexistent_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut registry = s.take_shared<AdminRegistry>();
        admin::revoke(&cap, &mut registry, USER, s.ctx()); // USER was never granted
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PASSPORT MODULE
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_passport_mint_default_fields() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        passport::mint(&cap, USER, s.ctx());
        s.return_to_sender(cap);
    };
    // Passport is soul-bound to USER; advance as USER to inspect it
    s.next_tx(USER);
    {
        let p = s.take_from_sender<ArktionPassport>();
        assert!(passport::owner(&p) == USER);
        assert!(passport::level(&p) == 1);
        assert!(passport::total_ink_earned(&p) == 0);
        assert!(passport::chapters_read(&p) == 0);
        assert!(passport::series_completed(&p) == 0);
        assert!(passport::series_tracked(&p) == 0);
        assert!(passport::identity_snapshot_blob_id(&p).is_none());
        s.return_to_sender(p);
    };
    s.end();
}

#[test]
fun test_passport_level_thresholds() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        passport::mint(&cap, ADMIN, s.ctx()); // mint to ADMIN so same tx can mutate it
        s.return_to_sender(cap);
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut p = s.take_from_sender<ArktionPassport>();
        // Boundary at each threshold
        passport::update_stats(&cap, &mut p, 0, 0, 0, 499);   assert!(passport::level(&p) == 1);
        passport::update_stats(&cap, &mut p, 0, 0, 0, 500);   assert!(passport::level(&p) == 2);
        passport::update_stats(&cap, &mut p, 0, 0, 0, 2000);  assert!(passport::level(&p) == 3);
        passport::update_stats(&cap, &mut p, 0, 0, 0, 6000);  assert!(passport::level(&p) == 4);
        passport::update_stats(&cap, &mut p, 0, 0, 0, 15000); assert!(passport::level(&p) == 5);
        passport::update_stats(&cap, &mut p, 0, 0, 0, 40000); assert!(passport::level(&p) == 6);
        s.return_to_sender(p);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test]
fun test_passport_set_blob_id() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        passport::mint(&cap, ADMIN, s.ctx());
        s.return_to_sender(cap);
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut p = s.take_from_sender<ArktionPassport>();
        passport::set_blob_id(&cap, &mut p, b"walrus-blob-123", s.ctx());
        assert!(passport::identity_snapshot_blob_id(&p).is_some());
        s.return_to_sender(p);
        s.return_to_sender(cap);
    };
    s.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// INK MODULE
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_ink_init_creates_empty_treasury() {
    let mut s = test_scenario::begin(ADMIN);
    { ink::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let treasury = s.take_from_sender<TreasuryCap<INK>>();
        assert!(ink::get_total_supply(&treasury) == 0);
        s.return_to_sender(treasury);
    };
    s.end();
}

#[test]
fun test_ink_mint_and_supply() {
    let mut s = test_scenario::begin(ADMIN);
    {
        admin::init_for_testing(s.ctx());
        ink::init_for_testing(s.ctx());
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        ink::mint(&cap, &mut treasury, 100, USER, s.ctx());
        assert!(ink::get_total_supply(&treasury) == 100);
        s.return_to_sender(treasury);
        s.return_to_sender(cap);
    };
    // Coin lands in USER's inventory
    s.next_tx(USER);
    {
        let coin = s.take_from_sender<Coin<INK>>();
        assert!(coin.value() == 100);
        s.return_to_sender(coin);
    };
    s.end();
}

#[test]
fun test_ink_burn_reduces_supply() {
    let mut s = test_scenario::begin(ADMIN);
    {
        admin::init_for_testing(s.ctx());
        ink::init_for_testing(s.ctx());
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        ink::mint(&cap, &mut treasury, 50, ADMIN, s.ctx());
        s.return_to_sender(treasury);
        s.return_to_sender(cap);
    };
    s.next_tx(ADMIN);
    {
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        let coin = s.take_from_sender<Coin<INK>>();
        ink::burn(&mut treasury, coin);
        assert!(ink::get_total_supply(&treasury) == 0);
        s.return_to_sender(treasury);
    };
    s.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// INK EARNING MODULE
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_earn_chapter_read_mints_10_ink() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_ink_earn(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        let mut registry = s.take_shared<EarningRegistry>();
        ink_earning::earn(&cap, &mut treasury, &mut registry, USER, 0, b"key-cr-001".to_string(), s.ctx());
        assert!(ink::get_total_supply(&treasury) == 10);
        test_scenario::return_shared(registry);
        s.return_to_sender(treasury);
        s.return_to_sender(cap);
    };
    s.next_tx(USER);
    {
        let coin = s.take_from_sender<Coin<INK>>();
        assert!(coin.value() == 10);
        s.return_to_sender(coin);
        // EarningRecord transferred to USER as on-chain audit trail
        let record = s.take_from_sender<EarningRecord>();
        s.return_to_sender(record);
    };
    s.end();
}

#[test]
fun test_earn_series_complete_mints_100_ink() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_ink_earn(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        let mut registry = s.take_shared<EarningRegistry>();
        ink_earning::earn(&cap, &mut treasury, &mut registry, USER, 1, b"key-sc-001".to_string(), s.ctx());
        assert!(ink::get_total_supply(&treasury) == 100);
        test_scenario::return_shared(registry);
        s.return_to_sender(treasury);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test]
fun test_earn_submission_approved_mints_50_ink() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_ink_earn(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        let mut registry = s.take_shared<EarningRegistry>();
        ink_earning::earn(&cap, &mut treasury, &mut registry, USER, 2, b"key-sa-001".to_string(), s.ctx());
        assert!(ink::get_total_supply(&treasury) == 50);
        test_scenario::return_shared(registry);
        s.return_to_sender(treasury);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test]
fun test_earn_different_keys_both_succeed() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_ink_earn(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        let mut registry = s.take_shared<EarningRegistry>();
        ink_earning::earn(&cap, &mut treasury, &mut registry, USER, 0, b"key-A".to_string(), s.ctx());
        ink_earning::earn(&cap, &mut treasury, &mut registry, USER, 0, b"key-B".to_string(), s.ctx());
        assert!(ink::get_total_supply(&treasury) == 20); // 10 + 10
        test_scenario::return_shared(registry);
        s.return_to_sender(treasury);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::ink_earning::EDuplicateIdempotencyKey)]
fun test_earn_duplicate_key_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_ink_earn(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        let mut registry = s.take_shared<EarningRegistry>();
        ink_earning::earn(&cap, &mut treasury, &mut registry, USER, 0, b"dup-key".to_string(), s.ctx());
        ink_earning::earn(&cap, &mut treasury, &mut registry, USER, 0, b"dup-key".to_string(), s.ctx());
        test_scenario::return_shared(registry);
        s.return_to_sender(treasury);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::ink_earning::EInvalidTriggerType)]
fun test_earn_invalid_trigger_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_ink_earn(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        let mut registry = s.take_shared<EarningRegistry>();
        ink_earning::earn(&cap, &mut treasury, &mut registry, USER, 99, b"key-bad".to_string(), s.ctx());
        test_scenario::return_shared(registry);
        s.return_to_sender(treasury);
        s.return_to_sender(cap);
    };
    s.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// READING HISTORY MODULE
//
// create_library: AdminCap-gated (NestJS bootstraps on first sign-in)
// add_or_update_record: owner-gated (USER signs — their reading state, their call)
// set_history_blob: AdminCap-gated (NestJS handles Walrus archival)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_reading_history_create_library() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        reading_history::create_library(&cap, USER, s.ctx());
        s.return_to_sender(cap);
    };
    // Library was transferred to USER
    s.next_tx(USER);
    {
        let library = s.take_from_sender<UserLibrary>();
        s.return_to_sender(library);
    };
    s.end();
}

#[test]
fun test_reading_history_add_and_update_record() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        reading_history::create_library(&cap, USER, s.ctx());
        s.return_to_sender(cap);
    };
    // USER updates their own library
    s.next_tx(USER);
    {
        let mut library = s.take_from_sender<UserLibrary>();
        // Add new record (status 0 = reading)
        reading_history::add_or_update_record(&mut library, b"series-abc".to_string(), 0, 5, s.ctx());
        // Update same series (status 1 = completed) — upsert, not abort
        reading_history::add_or_update_record(&mut library, b"series-abc".to_string(), 1, 120, s.ctx());
        s.return_to_sender(library);
    };
    s.end();
}

#[test]
fun test_reading_history_set_blob() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        reading_history::create_library(&cap, USER, s.ctx());
        s.return_to_sender(cap);
    };
    // NestJS archives old records — AdminCap-gated, takes USER's library by address
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut library = test_scenario::take_from_address<UserLibrary>(&s, USER);
        reading_history::set_history_blob(&cap, &mut library, b"walrus-archive-blob", s.ctx());
        test_scenario::return_to_address(USER, library);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::reading_history::EInvalidStatus)]
fun test_reading_history_invalid_status_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        reading_history::create_library(&cap, USER, s.ctx());
        s.return_to_sender(cap);
    };
    s.next_tx(USER);
    {
        let mut library = s.take_from_sender<UserLibrary>();
        reading_history::add_or_update_record(&mut library, b"s1".to_string(), 99, 0, s.ctx());
        s.return_to_sender(library);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::reading_history::ENotOwner)]
fun test_reading_history_wrong_owner_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        reading_history::create_library(&cap, USER, s.ctx());
        s.return_to_sender(cap);
    };
    // ADMIN tries to update USER's library — must abort
    s.next_tx(ADMIN);
    {
        let mut library = test_scenario::take_from_address<UserLibrary>(&s, USER);
        reading_history::add_or_update_record(&mut library, b"s1".to_string(), 0, 1, s.ctx());
        test_scenario::return_to_address(USER, library);
    };
    s.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOURNAL MODULE
//
// create_journal: AdminCap-gated (NestJS bootstraps on first sign-in)
// add_entry, update_entry, mark_as_submitted: owner-gated (USER signs)
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_journal_full_flow() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        journal::create_journal(&cap, USER, s.ctx());
        s.return_to_sender(cap);
    };
    // USER manages their own journal
    s.next_tx(USER);
    {
        let mut j = s.take_from_sender<UserJournal>();
        journal::add_entry(
            &mut j,
            b"entry-001".to_string(),
            b"Solo Leveling".to_string(),
            1,                                    // FORMAT_MANGA
            b"https://mangadex.org/title/1".to_string(),
            200, 87,
            b"Peak fiction".to_string(),
            s.ctx(),
        );
        journal::update_entry(&mut j, b"entry-001".to_string(), 100, b"Still peak".to_string(), s.ctx());
        journal::mark_as_submitted(&mut j, b"entry-001".to_string(), s.ctx());
        // mark_as_submitted is idempotent — calling twice must not abort
        journal::mark_as_submitted(&mut j, b"entry-001".to_string(), s.ctx());
        s.return_to_sender(j);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::journal::EEntryNotFound)]
fun test_journal_update_nonexistent_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        journal::create_journal(&cap, USER, s.ctx());
        s.return_to_sender(cap);
    };
    s.next_tx(USER);
    {
        let mut j = s.take_from_sender<UserJournal>();
        journal::update_entry(&mut j, b"ghost-entry".to_string(), 1, b"".to_string(), s.ctx());
        s.return_to_sender(j);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::journal::EEntryNotFound)]
fun test_journal_submit_nonexistent_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        journal::create_journal(&cap, USER, s.ctx());
        s.return_to_sender(cap);
    };
    s.next_tx(USER);
    {
        let mut j = s.take_from_sender<UserJournal>();
        journal::mark_as_submitted(&mut j, b"ghost-entry".to_string(), s.ctx());
        s.return_to_sender(j);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::journal::EInvalidFormat)]
fun test_journal_invalid_format_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        journal::create_journal(&cap, USER, s.ctx());
        s.return_to_sender(cap);
    };
    s.next_tx(USER);
    {
        let mut j = s.take_from_sender<UserJournal>();
        journal::add_entry(&mut j, b"e1".to_string(), b"Title".to_string(), 99, b"url".to_string(), 0, 0, b"".to_string(), s.ctx());
        s.return_to_sender(j);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::journal::ENotOwner)]
fun test_journal_wrong_owner_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        journal::create_journal(&cap, USER, s.ctx());
        s.return_to_sender(cap);
    };
    // ADMIN tries to add to USER's journal — must abort
    s.next_tx(ADMIN);
    {
        let mut j = test_scenario::take_from_address<UserJournal>(&s, USER);
        journal::add_entry(&mut j, b"e1".to_string(), b"T".to_string(), 0, b"url".to_string(), 0, 0, b"".to_string(), s.ctx());
        test_scenario::return_to_address(USER, j);
    };
    s.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERIES BADGES MODULE
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_series_badge_mint_soul_bound() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        series_badges::mint(
            &cap, USER,
            b"series-dark-gathering".to_string(),
            4,                         // LEGEND
            0,
            b"walrus-blob-badge-bytes",
            s.ctx(),
        );
        s.return_to_sender(cap);
    };
    s.next_tx(USER);
    {
        // Badge is soul-bound to USER — verify it exists in their inventory
        assert!(s.has_most_recent_for_sender<SeriesBadge>());
        let badge = s.take_from_sender<SeriesBadge>();
        s.return_to_sender(badge);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::series_badges::EInvalidBadgeType)]
fun test_series_badge_invalid_type_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        series_badges::mint(&cap, USER, b"s1".to_string(), 99, 0, b"blob", s.ctx());
        s.return_to_sender(cap);
    };
    s.end();
}

#[test]
fun test_series_badge_all_valid_types() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        // All five badge types must mint without aborting
        series_badges::mint(&cap, USER, b"s1".to_string(), 0, 0, b"blob", s.ctx()); // INITIATE
        series_badges::mint(&cap, USER, b"s1".to_string(), 1, 0, b"blob", s.ctx()); // SCHOLAR
        series_badges::mint(&cap, USER, b"s1".to_string(), 2, 0, b"blob", s.ctx()); // VETERAN
        series_badges::mint(&cap, USER, b"s1".to_string(), 3, 0, b"blob", s.ctx()); // ELDER
        series_badges::mint(&cap, USER, b"s1".to_string(), 4, 0, b"blob", s.ctx()); // LEGEND
        s.return_to_sender(cap);
    };
    s.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MISSING EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_passport_blob_id_overwrites() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        passport::mint(&cap, ADMIN, s.ctx());
        s.return_to_sender(cap);
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut p = s.take_from_sender<ArktionPassport>();
        passport::set_blob_id(&cap, &mut p, b"blob-v1", s.ctx());
        assert!(*passport::identity_snapshot_blob_id(&p).borrow() == b"blob-v1");
        // Second call must overwrite, not append or clear
        passport::set_blob_id(&cap, &mut p, b"blob-v2", s.ctx());
        assert!(*passport::identity_snapshot_blob_id(&p).borrow() == b"blob-v2");
        s.return_to_sender(p);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test]
fun test_earn_all_three_triggers_accumulate_correctly() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_ink_earn(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        let mut registry = s.take_shared<EarningRegistry>();
        ink_earning::earn(&cap, &mut treasury, &mut registry, USER, 0, b"k1".to_string(), s.ctx()); //  10
        ink_earning::earn(&cap, &mut treasury, &mut registry, USER, 1, b"k2".to_string(), s.ctx()); // 100
        ink_earning::earn(&cap, &mut treasury, &mut registry, USER, 2, b"k3".to_string(), s.ctx()); //  50
        assert!(ink::get_total_supply(&treasury) == 160);
        test_scenario::return_shared(registry);
        s.return_to_sender(treasury);
        s.return_to_sender(cap);
    };
    s.end();
}

/// Verifies that submitted_as_suggestion is false before marking, true after,
/// and stays true on a second call (idempotency).
#[test]
fun test_journal_submission_flag_is_set() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        journal::create_journal(&cap, USER, s.ctx());
        s.return_to_sender(cap);
    };
    s.next_tx(USER);
    {
        let mut j = s.take_from_sender<UserJournal>();
        journal::add_entry(
            &mut j,
            b"e-submit".to_string(),
            b"Berserk".to_string(),
            1, // FORMAT_MANGA
            b"https://mangadex.org/title/berserk".to_string(),
            374, 374,
            b"Masterpiece".to_string(),
            s.ctx(),
        );
        assert!(!journal::submitted_as_suggestion_for_testing(&j, b"e-submit".to_string()));
        journal::mark_as_submitted(&mut j, b"e-submit".to_string(), s.ctx());
        assert!(journal::submitted_as_suggestion_for_testing(&j, b"e-submit".to_string()));
        // Second call must be idempotent — flag stays true, no abort
        journal::mark_as_submitted(&mut j, b"e-submit".to_string(), s.ctx());
        assert!(journal::submitted_as_suggestion_for_testing(&j, b"e-submit".to_string()));
        s.return_to_sender(j);
    };
    s.end();
}

/// Verifies that all four stat fields are updated by update_stats, not just level.
#[test]
fun test_passport_update_stats_all_fields() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        passport::mint(&cap, ADMIN, s.ctx());
        s.return_to_sender(cap);
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut p = s.take_from_sender<ArktionPassport>();
        passport::update_stats(&cap, &mut p, 42, 7, 15, 1200);
        assert!(passport::chapters_read(&p) == 42);
        assert!(passport::series_completed(&p) == 7);
        assert!(passport::series_tracked(&p) == 15);
        assert!(passport::total_ink_earned(&p) == 1200);
        assert!(passport::level(&p) == 2); // 500 <= 1200 < 2000
        s.return_to_sender(p);
        s.return_to_sender(cap);
    };
    s.end();
}

/// Verifies that metadata_blob_id is permanently anchored to the badge at mint time.
#[test]
fun test_series_badge_metadata_blob_id_anchored() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        series_badges::mint(
            &cap, USER,
            b"series-chainsaw".to_string(),
            3, // ELDER
            0,
            b"walrus-badge-meta-abc123",
            s.ctx(),
        );
        s.return_to_sender(cap);
    };
    s.next_tx(USER);
    {
        let badge = s.take_from_sender<SeriesBadge>();
        assert!(series_badges::metadata_blob_id_for_testing(&badge) == b"walrus-badge-meta-abc123");
        s.return_to_sender(badge);
    };
    s.end();
}

#[test]
fun test_reading_history_completed_at_set_once() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        reading_history::create_library(&cap, USER, s.ctx());
        s.return_to_sender(cap);
    };
    s.next_tx(USER);
    {
        let mut library = s.take_from_sender<UserLibrary>();
        // First completion sets completed_at
        reading_history::add_or_update_record(&mut library, b"series-1".to_string(), 1, 50, s.ctx());
        let first = reading_history::completed_at_for_testing(&library, b"series-1".to_string());
        assert!(first.is_some());
        // Calling again with STATUS_COMPLETED must not overwrite it
        reading_history::add_or_update_record(&mut library, b"series-1".to_string(), 1, 50, s.ctx());
        let second = reading_history::completed_at_for_testing(&library, b"series-1".to_string());
        assert!(second == first);
        s.return_to_sender(library);
    };
    s.end();
}
