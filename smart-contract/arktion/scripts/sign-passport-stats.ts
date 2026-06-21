/**
 * Canonical reference for the `passport::update_stats_attested` signing scheme.
 *
 * This is BOTH:
 *   1. The exact thing the NestJS backend must replicate to attest a stats update, and
 *   2. The generator for the hardcoded signatures used in the Move tests.
 *
 * Wire contract (must match `StatsAttestation` in passport.move byte-for-byte):
 *   bytes[ 0..32] = passport object id (32 raw bytes == ID inner address, no length prefix)
 *   bytes[32..40] = chapters_read    (u64, little-endian)
 *   bytes[40..48] = series_completed (u64, little-endian)
 *   bytes[48..56] = series_tracked   (u64, little-endian)
 *   bytes[56..64] = total_ink_earned (u64, little-endian)
 *
 * The admin signs these 64 bytes with its Ed25519 key; the 32-byte public key
 * (`getPublicKey().toRawBytes()`) is what is stored in the shared PassportConfig.
 *
 * Usage (run from a context that resolves @mysten/sui, e.g. the backend workspace):
 *   tsx sign-passport-stats.ts <passportIdHex> <chapters> <seriesCompleted> <seriesTracked> <ink>
 *
 * Example:
 *   node --import tsx smart-contract/arktion/scripts/sign-passport-stats.ts \
 *     0xabc...def 42 7 15 1200
 *
 * The fixed TEST_SEED below produces a deterministic keypair so the Move tests can
 * pin TEST_PUBKEY + signatures. PRODUCTION MUST NOT use this seed — the backend
 * loads its real admin key from a secret.
 */
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { bcs } from '@mysten/sui/bcs';
import { toHex } from '@mysten/sui/utils';

// Deterministic 32-byte seed for TEST VECTORS ONLY.
const TEST_SEED = new Uint8Array(32).fill(7);

const StatsAttestation = bcs.struct('StatsAttestation', {
  passport_id: bcs.Address, // ID -> address -> 32 raw bytes
  chapters_read: bcs.u64(),
  series_completed: bcs.u64(),
  series_tracked: bcs.u64(),
  total_ink_earned: bcs.u64(),
});

export function buildMessage(
  passportId: string,
  chaptersRead: bigint,
  seriesCompleted: bigint,
  seriesTracked: bigint,
  totalInkEarned: bigint,
): Uint8Array {
  return StatsAttestation.serialize({
    passport_id: passportId,
    chapters_read: chaptersRead,
    series_completed: seriesCompleted,
    series_tracked: seriesTracked,
    total_ink_earned: totalInkEarned,
  }).toBytes();
}

/** Format bytes as a Move `vector[u8]` literal for pasting into tests. */
function toMoveVector(bytes: Uint8Array): string {
  return `vector[${Array.from(bytes).join(', ')}]`;
}

async function main() {
  const [idArg, chaptersArg, completedArg, trackedArg, inkArg] = process.argv.slice(2);
  if (!idArg) {
    console.error(
      'usage: tsx sign-passport-stats.ts <passportIdHex> <chapters> <seriesCompleted> <seriesTracked> <ink>',
    );
    process.exit(1);
  }

  const keypair = Ed25519Keypair.fromSecretKey(TEST_SEED);
  const pubkey = keypair.getPublicKey().toRawBytes();

  const message = buildMessage(
    idArg,
    BigInt(chaptersArg ?? 0),
    BigInt(completedArg ?? 0),
    BigInt(trackedArg ?? 0),
    BigInt(inkArg ?? 0),
  );

  // Raw 64-byte Ed25519 signature over the message bytes. NOTE: use `sign`, not
  // `signPersonalMessage`/`signTransaction` — those prepend a Sui intent + BCS
  // wrapper, which `sui::ed25519::ed25519_verify` does NOT expect.
  const rawSig = await keypair.sign(message);

  console.log('// passport id :', idArg);
  console.log('// message (hex):', '0x' + toHex(message), `(${message.length} bytes)`);
  console.log('// --- paste into arktion_tests.move ---');
  console.log('// TEST_PUBKEY (32 bytes):');
  console.log(toMoveVector(pubkey));
  console.log('// signature (64 bytes):');
  console.log(toMoveVector(rawSig));
  console.log('// pubkey hex (for PassportConfig / backend env):', '0x' + toHex(pubkey));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
