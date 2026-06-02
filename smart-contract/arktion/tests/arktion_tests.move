#[test_only]
module arktion::arktion_tests;

use arktion::admin::{Self, AdminCap, AdminRegistry};
use arktion::passport::{Self, ArktionPassport};
use arktion::ink::{Self, INK};
use arktion::ink_earning::{Self, EarningRegistry, EarningRecord};
use arktion::reading_history::{Self, UserLibrary};
use arktion::journal::{Self, UserJournal};
use arktion::badges::{Self, ArktionBadge, BadgeRegistry};
use arktion::submission::{Self, Submission};
use sui::coin::{Coin, TreasuryCap};
use sui::test_scenario;

// ─── Test addresses ──────────────────────────────────────────────────────────

const ADMIN: address = @0xAD;
const USER: address = @0xBEEF;

// ─── Shared setup helpers ─────────────────────────────────────────────────────

/// Init admin + ink + ink_earning in a single transaction.
/// Call inside the first {} block of a scenario, then advance with next_tx.
fun setup_ink_earn(scenario: &mut test_scenario::Scenario) {
    admin::init_for_testing(scenario.ctx());
    ink::init_for_testing(scenario.ctx());
    ink_earning::init_for_testing(scenario.ctx());
}

/// Init admin + badges. Used by tests that only touch the badges module.
fun setup_badges(scenario: &mut test_scenario::Scenario) {
    admin::init_for_testing(scenario.ctx());
    badges::init_for_testing(scenario.ctx());
}

/// Init everything needed for end-to-end submission tests:
/// admin + ink + ink_earning + badges.
fun setup_full_stack(scenario: &mut test_scenario::Scenario) {
    admin::init_for_testing(scenario.ctx());
    ink::init_for_testing(scenario.ctx());
    ink_earning::init_for_testing(scenario.ctx());
    badges::init_for_testing(scenario.ctx());
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
        admin::grant(&cap, ADMIN, &mut registry, s.ctx()); // ADMIN is already in registry
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
        passport::mint(&cap, ADMIN, s.ctx());
        s.return_to_sender(cap);
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut p = s.take_from_sender<ArktionPassport>();
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
        passport::set_blob_id(&cap, &mut p, b"blob-v2", s.ctx());
        assert!(*passport::identity_snapshot_blob_id(&p).borrow() == b"blob-v2");
        s.return_to_sender(p);
        s.return_to_sender(cap);
    };
    s.end();
}

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
        assert!(ink::get_total_supply(&treasury) == 20);
        test_scenario::return_shared(registry);
        s.return_to_sender(treasury);
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
    s.next_tx(USER);
    {
        let mut library = s.take_from_sender<UserLibrary>();
        reading_history::add_or_update_record(&mut library, b"series-abc".to_string(), 0, 5, s.ctx());
        reading_history::add_or_update_record(&mut library, b"series-abc".to_string(), 1, 120, s.ctx());
        s.return_to_sender(library);
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
        reading_history::add_or_update_record(&mut library, b"series-1".to_string(), 1, 50, s.ctx());
        let first = reading_history::completed_at_for_testing(&library, b"series-1".to_string());
        assert!(first.is_some());
        reading_history::add_or_update_record(&mut library, b"series-1".to_string(), 1, 50, s.ctx());
        let second = reading_history::completed_at_for_testing(&library, b"series-1".to_string());
        assert!(second == first);
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
    s.next_tx(USER);
    {
        let mut j = s.take_from_sender<UserJournal>();
        journal::add_entry(
            &mut j,
            b"entry-001".to_string(),
            b"Solo Leveling".to_string(),
            1,
            b"https://mangadex.org/title/1".to_string(),
            200, 87,
            b"Peak fiction".to_string(),
            s.ctx(),
        );
        journal::update_entry(&mut j, b"entry-001".to_string(), 100, b"Still peak".to_string(), s.ctx());
        journal::mark_as_submitted(&mut j, b"entry-001".to_string(), s.ctx());
        journal::mark_as_submitted(&mut j, b"entry-001".to_string(), s.ctx()); // idempotent
        s.return_to_sender(j);
    };
    s.end();
}

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
            1,
            b"https://mangadex.org/title/berserk".to_string(),
            374, 374,
            b"Masterpiece".to_string(),
            s.ctx(),
        );
        assert!(!journal::submitted_as_suggestion_for_testing(&j, b"e-submit".to_string()));
        journal::mark_as_submitted(&mut j, b"e-submit".to_string(), s.ctx());
        assert!(journal::submitted_as_suggestion_for_testing(&j, b"e-submit".to_string()));
        journal::mark_as_submitted(&mut j, b"e-submit".to_string(), s.ctx());
        assert!(journal::submitted_as_suggestion_for_testing(&j, b"e-submit".to_string()));
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
    s.next_tx(ADMIN);
    {
        let mut j = test_scenario::take_from_address<UserJournal>(&s, USER);
        journal::add_entry(&mut j, b"e1".to_string(), b"T".to_string(), 0, b"url".to_string(), 0, 0, b"".to_string(), s.ctx());
        test_scenario::return_to_address(USER, j);
    };
    s.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// BADGES MODULE
//
// Replaces the old series_badges module. Now covers all 5 categories
// (Reading Achievement, Community, Series Lore, Creator, Contributor) with
// composite-key idempotency: (recipient, category, badge_type, series_id) is
// unique. Series Lore badges MUST have a non-empty series_id; all other
// categories MUST have empty series_id.
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_badges_mint_series_lore_soul_bound() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_badges(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut registry = s.take_shared<BadgeRegistry>();
        badges::mint(
            &cap,
            &mut registry,
            USER,
            badges::category_series_lore(),
            4, // LEGEND tier in the Series Lore enum
            b"series-dark-gathering".to_string(),
            4,
            b"walrus-blob-badge-bytes",
            s.ctx(),
        );
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.next_tx(USER);
    {
        assert!(s.has_most_recent_for_sender<ArktionBadge>());
        let badge = s.take_from_sender<ArktionBadge>();
        assert!(badges::category(&badge) == badges::category_series_lore());
        assert!(badges::series_id(&badge) == b"series-dark-gathering".to_string());
        assert!(badges::metadata_blob_id(&badge) == b"walrus-blob-badge-bytes");
        s.return_to_sender(badge);
    };
    s.end();
}

#[test]
fun test_badges_mint_reading_achievement_no_series_id() {
    // Verifies Reading Achievement category mints correctly with an empty series_id.
    // This is the Completionist-style badge minted on series completion that the
    // demo flow depends on.
    let mut s = test_scenario::begin(ADMIN);
    { setup_badges(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut registry = s.take_shared<BadgeRegistry>();
        badges::mint(
            &cap,
            &mut registry,
            USER,
            badges::category_reading_achievement(),
            2, // e.g. SERIES_COMPLETIONIST in the Reading Achievement enum
            b"".to_string(),
            0,
            b"walrus-completionist-blob",
            s.ctx(),
        );
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.next_tx(USER);
    {
        let badge = s.take_from_sender<ArktionBadge>();
        assert!(badges::category(&badge) == badges::category_reading_achievement());
        assert!(badges::series_id(&badge) == b"".to_string());
        s.return_to_sender(badge);
    };
    s.end();
}

#[test]
fun test_badges_all_five_categories_mintable() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_badges(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut registry = s.take_shared<BadgeRegistry>();
        // Each category mints once. Series Lore requires a non-empty series_id;
        // every other category requires an empty series_id.
        badges::mint(&cap, &mut registry, USER, badges::category_reading_achievement(), 0, b"".to_string(),         0, b"blob", s.ctx());
        badges::mint(&cap, &mut registry, USER, badges::category_community(),           0, b"".to_string(),         0, b"blob", s.ctx());
        badges::mint(&cap, &mut registry, USER, badges::category_series_lore(),         0, b"series-a".to_string(), 0, b"blob", s.ctx());
        badges::mint(&cap, &mut registry, USER, badges::category_creator(),             0, b"".to_string(),         0, b"blob", s.ctx());
        badges::mint(&cap, &mut registry, USER, badges::category_contributor(),         0, b"".to_string(),         0, b"blob", s.ctx());
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.end();
}

/// THE EMPTY-SERIES-ID TEST.
/// Series Lore badges MUST be tied to a specific series. Minting one with an
/// empty series_id is a category-vs-data invariant violation and aborts with
/// ESeriesIdMismatch.
#[test, expected_failure(abort_code = ::arktion::badges::ESeriesIdMismatch)]
fun test_badges_series_lore_empty_series_id_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_badges(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut registry = s.take_shared<BadgeRegistry>();
        badges::mint(
            &cap,
            &mut registry,
            USER,
            badges::category_series_lore(),
            0,
            b"".to_string(),    // <-- empty: must abort
            0,
            b"blob",
            s.ctx(),
        );
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.end();
}

/// The mirror of the above: a non-Series-Lore category MUST have an empty
/// series_id. Passing a populated series_id is the same invariant violation.
#[test, expected_failure(abort_code = ::arktion::badges::ESeriesIdMismatch)]
fun test_badges_reading_achievement_with_series_id_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_badges(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut registry = s.take_shared<BadgeRegistry>();
        badges::mint(
            &cap,
            &mut registry,
            USER,
            badges::category_reading_achievement(),
            0,
            b"series-a".to_string(), // <-- non-empty for non-Series-Lore: must abort
            0,
            b"blob",
            s.ctx(),
        );
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.end();
}

/// Composite-key idempotency: minting the same (recipient, category, badge_type,
/// series_id) twice aborts the second call. Different series_id is a different
/// key, so it succeeds.
#[test, expected_failure(abort_code = ::arktion::badges::EBadgeAlreadyMinted)]
fun test_badges_duplicate_composite_key_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_badges(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut registry = s.take_shared<BadgeRegistry>();
        badges::mint(&cap, &mut registry, USER, badges::category_series_lore(), 0, b"series-x".to_string(), 0, b"blob", s.ctx());
        // Same (recipient, category=series_lore, badge_type=0, series_id="series-x")
        badges::mint(&cap, &mut registry, USER, badges::category_series_lore(), 0, b"series-x".to_string(), 0, b"blob", s.ctx());
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test]
fun test_badges_different_series_id_no_collision() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_badges(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut registry = s.take_shared<BadgeRegistry>();
        // Same recipient, same category, same badge_type, DIFFERENT series_id.
        // Composite key differs, so both succeed.
        badges::mint(&cap, &mut registry, USER, badges::category_series_lore(), 0, b"series-a".to_string(), 0, b"blob", s.ctx());
        badges::mint(&cap, &mut registry, USER, badges::category_series_lore(), 0, b"series-b".to_string(), 0, b"blob", s.ctx());
        assert!(badges::has_badge_for_testing(&registry, USER, badges::category_series_lore(), 0, b"series-a".to_string()));
        assert!(badges::has_badge_for_testing(&registry, USER, badges::category_series_lore(), 0, b"series-b".to_string()));
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::badges::EInvalidCategory)]
fun test_badges_invalid_category_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_badges(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut registry = s.take_shared<BadgeRegistry>();
        badges::mint(&cap, &mut registry, USER, 99, 0, b"".to_string(), 0, b"blob", s.ctx());
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test]
fun test_badges_metadata_blob_id_anchored() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_badges(&mut s); };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut registry = s.take_shared<BadgeRegistry>();
        badges::mint(
            &cap,
            &mut registry,
            USER,
            badges::category_series_lore(),
            3,
            b"series-chainsaw".to_string(),
            3,
            b"walrus-badge-meta-abc123",
            s.ctx(),
        );
        test_scenario::return_shared(registry);
        s.return_to_sender(cap);
    };
    s.next_tx(USER);
    {
        let badge = s.take_from_sender<ArktionBadge>();
        assert!(badges::metadata_blob_id(&badge) == b"walrus-badge-meta-abc123");
        s.return_to_sender(badge);
    };
    s.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBMISSION MODULE
//
// New shared-object-per-submission architecture. claim_reward is atomic:
// it mints INK + Contributor badge + sets reward_claimed in one transaction.
// Any failure rolls the whole thing back.
// ═══════════════════════════════════════════════════════════════════════════════

#[test]
fun test_submission_create_pending_status() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(USER);
    {
        submission::create(
            b"Solo Leveling".to_string(),
            1,
            b"https://mangadex.org/title/solo-leveling".to_string(),
            b"mangadex".to_string(),
            s.ctx(),
        );
    };
    s.next_tx(USER);
    {
        let sub = s.take_shared<Submission>();
        assert!(submission::submitter(&sub) == USER);
        assert!(submission::status(&sub) == submission::status_pending());
        assert!(submission::reviewed_at(&sub).is_none());
        assert!(!submission::reward_claimed(&sub));
        test_scenario::return_shared(sub);
    };
    s.end();
}

#[test]
fun test_submission_approve_flow() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(USER);
    {
        submission::create(b"Berserk".to_string(), 1, b"url".to_string(), b"src".to_string(), s.ctx());
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut sub = s.take_shared<Submission>();
        submission::approve(&cap, &mut sub, s.ctx());
        assert!(submission::status(&sub) == submission::status_approved());
        assert!(submission::reviewed_at(&sub).is_some());
        test_scenario::return_shared(sub);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test]
fun test_submission_reject_flow() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(USER);
    {
        submission::create(b"Naruto".to_string(), 1, b"url".to_string(), b"src".to_string(), s.ctx());
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut sub = s.take_shared<Submission>();
        submission::reject(&cap, &mut sub, s.ctx());
        assert!(submission::status(&sub) == submission::status_rejected());
        assert!(submission::reviewed_at(&sub).is_some());
        test_scenario::return_shared(sub);
        s.return_to_sender(cap);
    };
    s.end();
}

/// End-to-end claim_reward: USER creates a submission, ADMIN approves it,
/// ADMIN calls claim_reward, and we verify INK + Contributor badge both
/// landed in USER's inventory and reward_claimed flipped to true.
#[test]
fun test_submission_claim_reward_full_flow() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_full_stack(&mut s); };
    s.next_tx(USER);
    {
        submission::create(b"Vagabond".to_string(), 1, b"url".to_string(), b"src".to_string(), s.ctx());
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut sub = s.take_shared<Submission>();
        submission::approve(&cap, &mut sub, s.ctx());
        test_scenario::return_shared(sub);
        s.return_to_sender(cap);
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        let mut earning_reg = s.take_shared<EarningRegistry>();
        let mut badge_reg = s.take_shared<BadgeRegistry>();
        let mut sub = s.take_shared<Submission>();

        submission::claim_reward(
            &cap,
            &mut treasury,
            &mut earning_reg,
            &mut badge_reg,
            &mut sub,
            b"reward-key-001".to_string(),
            b"walrus-contributor-badge",
            s.ctx(),
        );

        assert!(submission::reward_claimed(&sub));
        assert!(ink::get_total_supply(&treasury) == 50);
        assert!(badges::has_badge_for_testing(&badge_reg, USER, badges::category_contributor(), 0, b"".to_string()));

        test_scenario::return_shared(sub);
        test_scenario::return_shared(badge_reg);
        test_scenario::return_shared(earning_reg);
        s.return_to_sender(treasury);
        s.return_to_sender(cap);
    };
    s.next_tx(USER);
    {
        // INK landed
        let coin = s.take_from_sender<Coin<INK>>();
        assert!(coin.value() == 50);
        s.return_to_sender(coin);
        // EarningRecord audit trail
        let record = s.take_from_sender<EarningRecord>();
        s.return_to_sender(record);
        // Contributor badge landed
        let badge = s.take_from_sender<ArktionBadge>();
        assert!(badges::category(&badge) == badges::category_contributor());
        assert!(badges::series_id(&badge) == b"".to_string());
        s.return_to_sender(badge);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::submission::ENotPending)]
fun test_submission_approve_twice_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(USER);
    {
        submission::create(b"Title".to_string(), 0, b"url".to_string(), b"src".to_string(), s.ctx());
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut sub = s.take_shared<Submission>();
        submission::approve(&cap, &mut sub, s.ctx());
        submission::approve(&cap, &mut sub, s.ctx()); // second approve: not PENDING
        test_scenario::return_shared(sub);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::submission::ENotPending)]
fun test_submission_reject_after_approve_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(USER);
    {
        submission::create(b"Title".to_string(), 0, b"url".to_string(), b"src".to_string(), s.ctx());
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut sub = s.take_shared<Submission>();
        submission::approve(&cap, &mut sub, s.ctx());
        submission::reject(&cap, &mut sub, s.ctx()); // can't reject an approved submission
        test_scenario::return_shared(sub);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::submission::ENotApproved)]
fun test_submission_claim_reward_on_pending_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_full_stack(&mut s); };
    s.next_tx(USER);
    {
        submission::create(b"Title".to_string(), 0, b"url".to_string(), b"src".to_string(), s.ctx());
    };
    // No approve — claim_reward must abort with ENotApproved
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        let mut earning_reg = s.take_shared<EarningRegistry>();
        let mut badge_reg = s.take_shared<BadgeRegistry>();
        let mut sub = s.take_shared<Submission>();
        submission::claim_reward(
            &cap, &mut treasury, &mut earning_reg, &mut badge_reg, &mut sub,
            b"rk".to_string(), b"blob", s.ctx(),
        );
        test_scenario::return_shared(sub);
        test_scenario::return_shared(badge_reg);
        test_scenario::return_shared(earning_reg);
        s.return_to_sender(treasury);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::submission::ENotApproved)]
fun test_submission_claim_reward_on_rejected_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_full_stack(&mut s); };
    s.next_tx(USER);
    {
        submission::create(b"Title".to_string(), 0, b"url".to_string(), b"src".to_string(), s.ctx());
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut sub = s.take_shared<Submission>();
        submission::reject(&cap, &mut sub, s.ctx());
        test_scenario::return_shared(sub);
        s.return_to_sender(cap);
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        let mut earning_reg = s.take_shared<EarningRegistry>();
        let mut badge_reg = s.take_shared<BadgeRegistry>();
        let mut sub = s.take_shared<Submission>();
        submission::claim_reward(
            &cap, &mut treasury, &mut earning_reg, &mut badge_reg, &mut sub,
            b"rk".to_string(), b"blob", s.ctx(),
        );
        test_scenario::return_shared(sub);
        test_scenario::return_shared(badge_reg);
        test_scenario::return_shared(earning_reg);
        s.return_to_sender(treasury);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::submission::EAlreadyClaimed)]
fun test_submission_claim_reward_twice_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { setup_full_stack(&mut s); };
    s.next_tx(USER);
    {
        submission::create(b"Title".to_string(), 0, b"url".to_string(), b"src".to_string(), s.ctx());
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut sub = s.take_shared<Submission>();
        submission::approve(&cap, &mut sub, s.ctx());
        test_scenario::return_shared(sub);
        s.return_to_sender(cap);
    };
    s.next_tx(ADMIN);
    {
        let cap = s.take_from_sender<AdminCap>();
        let mut treasury = s.take_from_sender<TreasuryCap<INK>>();
        let mut earning_reg = s.take_shared<EarningRegistry>();
        let mut badge_reg = s.take_shared<BadgeRegistry>();
        let mut sub = s.take_shared<Submission>();
        submission::claim_reward(
            &cap, &mut treasury, &mut earning_reg, &mut badge_reg, &mut sub,
            b"rk-1".to_string(), b"blob", s.ctx(),
        );
        // Second claim attempt uses a fresh idempotency_key so the abort is from
        // reward_claimed, not from ink_earning. That's the guarantee being tested.
        submission::claim_reward(
            &cap, &mut treasury, &mut earning_reg, &mut badge_reg, &mut sub,
            b"rk-2".to_string(), b"blob", s.ctx(),
        );
        test_scenario::return_shared(sub);
        test_scenario::return_shared(badge_reg);
        test_scenario::return_shared(earning_reg);
        s.return_to_sender(treasury);
        s.return_to_sender(cap);
    };
    s.end();
}

#[test, expected_failure(abort_code = ::arktion::submission::EInvalidFormat)]
fun test_submission_invalid_format_aborts() {
    let mut s = test_scenario::begin(ADMIN);
    { admin::init_for_testing(s.ctx()); };
    s.next_tx(USER);
    {
        submission::create(b"Title".to_string(), 99, b"url".to_string(), b"src".to_string(), s.ctx());
    };
    s.end();
}
