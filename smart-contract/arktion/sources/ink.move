/// Arktion – INK Token Module
///
/// INK is the closed-loop engagement token. It is minted only through arktion::ink_earning
/// and cannot be purchased or traded on DEXes. The design intent is behavioral:
/// INK represents engagement history, not monetary value.
///
/// Mint gating: both AdminCap AND TreasuryCap must be present. This means even if
/// someone obtained a TreasuryCap somehow, they still cannot mint without AdminCap,
/// and vice versa. TreasuryCap lives in the NestJS ink_earning wallet.
///
/// Burn gating: TreasuryCap only — no AdminCap. NestJS calls this on behalf of the
/// user for gacha pulls (burn INK → receive cNFT). The TreasuryCap requirement is
/// sufficient because end users never call contracts directly.
module arktion::ink;

use arktion::admin::AdminCap;
use sui::coin::{Self, TreasuryCap, Coin};
use sui::coin_registry;

// ===== One-time witness =====

/// Must be named exactly `INK` (uppercase, matching module name) for the
/// one-time witness coin pattern. `drop` is the only required ability.
public struct INK has drop {}

// ===== Init =====

/// Runs once at publish. Creates the INK currency using the new coin registry API,
/// permanently deletes the MetadataCap to freeze symbol/name/description, and
/// sends TreasuryCap to the deployer.
/// Deployer subsequently transfers TreasuryCap to the NestJS ink_earning wallet.
fun init(witness: INK, ctx: &mut TxContext) {
    let (initializer, treasury) = coin_registry::new_currency_with_otw(
        witness,
        0,                                          // decimals: INK is whole units
        b"INK".to_string(),
        b"Arktion INK".to_string(),
        b"Arktion platform engagement token".to_string(),
        b"".to_string(),                            // no icon URL at launch
        ctx,
    );
    // Delete MetadataCap immediately — symbol/name/description are permanently frozen.
    coin_registry::finalize_and_delete_metadata_cap(initializer, ctx);
    transfer::public_transfer(treasury, ctx.sender());
}

// ===== Test helpers =====

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(INK {}, ctx);
}

// ===== Write functions =====

/// Mint `amount` INK and send to `recipient`.
/// Requires both AdminCap and TreasuryCap to prevent unilateral minting by
/// either the admin system or the treasury holder acting alone.
public fun mint(
    _cap: &AdminCap,
    treasury: &mut TreasuryCap<INK>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    let ink = coin::mint(treasury, amount, ctx);
    transfer::public_transfer(ink, recipient);
}

/// Burn `coin` and reduce total supply.
/// No AdminCap required — TreasuryCap is the gate, and only NestJS holds it.
/// Called when a user spends INK on gacha pulls.
public fun burn(treasury: &mut TreasuryCap<INK>, coin: Coin<INK>) {
    coin::burn(treasury, coin);
}

// ===== Read-only helpers =====

/// Total INK in circulation. Useful for NestJS dashboards and on-chain checks.
public fun get_total_supply(treasury: &TreasuryCap<INK>): u64 {
    coin::total_supply(treasury)
}
