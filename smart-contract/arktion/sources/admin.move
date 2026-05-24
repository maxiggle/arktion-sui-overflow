/// Arktion – Admin Module
///
/// Single source of truth for admin authorization across all 7 Arktion modules.
/// An AdminCap object is the on-chain proof of admin status; AdminRegistry is
/// the shared whitelist that NestJS (and anyone else) can query.
///
/// Deployment flow:
///   1. Package is published → init() runs → deployer receives AdminCap.
///   2. Deployer calls transfer::public_transfer to hand AdminCap to NestJS hot wallet.
///      (No module function needed because AdminCap has `store`.)
///   3. NestJS uses AdminCap to call grant/revoke on this module.
///
/// Key design decisions:
///   - AdminCap has `store` so it survives public_transfer without a wrapper fn.
///   - AdminRegistry is a shared object so any module/off-chain reader can check
///     is_admin without owning anything.
///   - revoke() only removes from the registry; it cannot destroy a foreign object.
///     NestJS must treat the registry as the authoritative source of active admins.
module arktion::admin;

use sui::event;

// ===== Error codes =====

/// Recipient is already registered as an admin.
const EAlreadyAdmin: u64 = 0;
/// Target address is not in the admin registry.
const ENotAdmin: u64 = 1;

// ===== Structs =====

/// Proof of admin authority. Passing `&AdminCap` to any guarded function is
/// sufficient authorization — Move's ownership model guarantees only the holder
/// can produce this reference.
///
/// `store` allows the cap to be transferred between wallets via
/// `transfer::public_transfer` without a dedicated module function.
public struct AdminCap has key, store {
    id: UID,
}

/// Canonical whitelist of active admin addresses. Shared so that:
///   - NestJS can read it without owning an object.
///   - Other Arktion modules can cross-check admin status if needed.
///   - On-chain explorers and indexers can surface the admin list publicly.
public struct AdminRegistry has key {
    id: UID,
    admins: vector<address>,
}

// ===== Events =====

public struct AdminGranted has copy, drop {
    recipient: address,
    granted_by: address,
}

public struct AdminRevoked has copy, drop {
    target: address,
    revoked_by: address,
}

// ===== Init =====

/// Runs exactly once when the package is published.
/// Sends AdminCap to the deployer and creates the shared AdminRegistry
/// with the deployer as the first registered admin.
fun init(ctx: &mut TxContext) {
    let cap = AdminCap { id: object::new(ctx) };
    transfer::transfer(cap, ctx.sender());

    let registry = AdminRegistry {
        id: object::new(ctx),
        admins: vector[ctx.sender()],
    };
    transfer::share_object(registry);
}

// ===== Admin management =====

/// Grant admin access to `recipient`.
/// Mints a fresh AdminCap and delivers it to `recipient`, then records the
/// address in AdminRegistry. Caller must present their own AdminCap.
///
/// Reverts with EAlreadyAdmin if `recipient` is already in the registry,
/// preventing duplicate entries that would complicate revocation.
public fun grant(
    _cap: &AdminCap,
    recipient: address,
    registry: &mut AdminRegistry,
    ctx: &mut TxContext,
) {
    assert!(!registry.admins.contains(&recipient), EAlreadyAdmin);

    let new_cap = AdminCap { id: object::new(ctx) };
    transfer::transfer(new_cap, recipient);

    registry.admins.push_back(recipient);

    event::emit(AdminGranted {
        recipient,
        granted_by: ctx.sender(),
    });
}

/// Revoke admin access for `target_address`.
/// Removes the address from AdminRegistry so NestJS and on-chain checks no
/// longer recognize it as an active admin.
///
/// NOTE: This does NOT destroy the target's AdminCap object — Move cannot
/// forcibly destroy an object owned by another address. The registry is the
/// authoritative source; NestJS must always verify via is_admin() or the
/// registry directly, not by the mere existence of an AdminCap.
///
/// Reverts with ENotAdmin if `target_address` is not in the registry.
public fun revoke(
    _cap: &AdminCap,
    registry: &mut AdminRegistry,
    target_address: address,
    ctx: &TxContext,
) {
    let (found, index) = registry.admins.index_of(&target_address);
    assert!(found, ENotAdmin);
    registry.admins.remove(index);

    event::emit(AdminRevoked {
        target: target_address,
        revoked_by: ctx.sender(),
    });
}

// ===== Read-only helpers =====

/// Returns true if `addr` is a currently registered admin.
/// Primary check for NestJS authorization middleware and other modules.
public fun is_admin(registry: &AdminRegistry, addr: address): bool {
    registry.admins.contains(&addr)
}

/// Returns a copy of the full admin address list.
/// Useful for NestJS to sync its local cache on startup.
public fun get_admins(registry: &AdminRegistry): vector<address> {
    registry.admins
}
