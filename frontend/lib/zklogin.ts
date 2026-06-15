/**
 * zkLogin utilities for Arktion.
 *
 * Responsibilities:
 *   - Generate the ephemeral Ed25519 keypair used as the nonce source
 *   - Persist ephemeral state in sessionStorage (cleared on tab/window close)
 *   - Request ZK proofs via the backend (which proxies to Enoki)
 *   - Assemble a ZkLoginSignature for on-chain transaction submission
 *
 * sessionStorage is intentional: the ephemeral key is short-lived by design.
 * If the user closes the tab after sign-in, they re-auth on next open (which
 * generates a fresh keypair + nonce). The session token in localStorage keeps
 * them signed in to the Arktion API; the ZK state is only needed for
 * on-chain operations like USDC tips.
 */

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
} from "@mysten/sui/zklogin";
import { apiClient } from "@/lib/api/client";

// ─── Storage keys ────────────────────────────────────────────────────────────

export const ZK_EPHEMERAL_KEY = "arktion_zk_ephemeral";
export const ZK_PROOF_KEY = "arktion_zk_proof";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoredEphemeralState {
  keypairSecret: string;
  maxEpoch: number;
  randomness: string;
}

export interface ZkProofInputs {
  proofPoints: {
    a: string[];
    b: string[][];
    c: string[];
  };
  issBase64Details: {
    value: string;
    indexMod4: number;
  };
  headerBase64: string;
  /** Returned by Enoki — used directly in getZkLoginSignature. */
  addressSeed: string;
}

export interface StoredZkState {
  proof: ZkProofInputs;
  maxEpoch: number;
  randomness: string;
  keypairSecret: string;
  /** Address seed returned by Enoki — used to assemble the zkLogin signature. */
  addressSeed: string;
}

// ─── Ephemeral keypair ────────────────────────────────────────────────────────

export function initEphemeralKeypair(maxEpoch: number): {
  keypair: Ed25519Keypair;
  nonce: string;
  randomness: string;
} {
  const keypair = new Ed25519Keypair();
  const randomness = generateRandomness();
  const nonce = generateNonce(keypair.getPublicKey(), maxEpoch, randomness);

  const state: StoredEphemeralState = {
    keypairSecret: keypair.getSecretKey(),
    maxEpoch,
    randomness: randomness.toString(),
  };
  sessionStorage.setItem(ZK_EPHEMERAL_KEY, JSON.stringify(state));

  return { keypair, nonce, randomness: randomness.toString() };
}

export function getEphemeralState(): {
  keypair: Ed25519Keypair;
  maxEpoch: number;
  randomness: string;
} | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ZK_EPHEMERAL_KEY);
  if (!raw) return null;
  try {
    const stored: StoredEphemeralState = JSON.parse(raw);
    const keypair = Ed25519Keypair.fromSecretKey(stored.keypairSecret);
    return { keypair, maxEpoch: stored.maxEpoch, randomness: stored.randomness };
  } catch {
    return null;
  }
}

// ─── ZK proof (via Enoki through backend proxy) ───────────────────────────────

/**
 * Request a ZK proof from Enoki via the backend proxy.
 * Enoki manages the salt internally — no salt param required.
 * Returns proof inputs including addressSeed (Enoki-computed).
 */
export async function requestZkProof(params: {
  jwt: string;
  keypair: Ed25519Keypair;
  maxEpoch: number;
  randomness: string;
}): Promise<ZkProofInputs> {
  const ephemeralPublicKey = getExtendedEphemeralPublicKey(
    params.keypair.getPublicKey(),
  );

  const { data } = await apiClient.post<ZkProofInputs>("/auth/zklogin/proof", {
    jwt: params.jwt,
    ephemeralPublicKey,
    maxEpoch: params.maxEpoch,
    randomness: params.randomness,
  });

  return data;
}

// ─── ZK state storage ─────────────────────────────────────────────────────────

export function storeZkState(params: {
  proof: ZkProofInputs;
  maxEpoch: number;
  randomness: string;
  keypairSecret: string;
}): void {
  const state: StoredZkState = {
    proof: params.proof,
    maxEpoch: params.maxEpoch,
    randomness: params.randomness,
    keypairSecret: params.keypairSecret,
    addressSeed: params.proof.addressSeed,
  };
  sessionStorage.setItem(ZK_PROOF_KEY, JSON.stringify(state));
}

export function getZkState(): StoredZkState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ZK_PROOF_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredZkState;
  } catch {
    return null;
  }
}

export function clearZkState(): void {
  sessionStorage.removeItem(ZK_EPHEMERAL_KEY);
  sessionStorage.removeItem(ZK_PROOF_KEY);
}

// ─── Transaction signing ──────────────────────────────────────────────────────

/**
 * Sign BCS-encoded transaction bytes using the stored ephemeral key + ZK proof.
 * addressSeed comes directly from Enoki — no local re-derivation needed.
 */
export async function signWithZkLogin(
  txBytes: Uint8Array,
  state: StoredZkState,
): Promise<string> {
  const keypair = Ed25519Keypair.fromSecretKey(state.keypairSecret);
  const { signature: ephemeralSignature } =
    await keypair.signTransaction(txBytes);

  console.log("[zkLogin] signWithZkLogin inputs", {
    maxEpoch: state.maxEpoch,
    addressSeed: state.addressSeed,
    ephemeralSigPrefix: ephemeralSignature.slice(0, 12),
    proofPointsA: state.proof.proofPoints.a,
    txBytesLength: txBytes.length,
  });

  const zkSig = getZkLoginSignature({
    inputs: {
      ...state.proof,
      addressSeed: state.addressSeed,
    },
    maxEpoch: state.maxEpoch,
    userSignature: ephemeralSignature,
  });

  console.log("[zkLogin] full zkLogin signature:", zkSig);
  return zkSig;
}
