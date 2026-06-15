import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { generateNonce, generateRandomness } from "@mysten/sui/zklogin";
import { suiClient } from "./sui";

const EPHEMERAL_KEY = "arktion.zklogin.ephemeral";
const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export interface EphemeralState {
  // bech32-encoded ed25519 secret key (suiprivkey...), reconstitutable via Ed25519Keypair.fromSecretKey
  secretKey: string;
  maxEpoch: number;
  randomness: string;
}

// Builds the ephemeral keypair + nonce, persists the ephemeral state to
// sessionStorage (so it survives the OAuth redirect), then sends the browser
// to Google with response_type=id_token and the zkLogin nonce.
export async function beginZkLogin(): Promise<void> {
  console.log("Beginning zkLogin flow");
  const ephemeralKeypair = Ed25519Keypair.generate();
  console.log(
    "Generated ephemeral keypair with public key",
    ephemeralKeypair.getPublicKey().toSuiAddress(),
  );
  const { epoch } = await suiClient.getLatestSuiSystemState();
  console.log("Current Sui epoch", epoch);
  const maxEpoch = Number(epoch) + 10;
  console.log("Setting zkLogin maxEpoch to", maxEpoch);
  const randomness = generateRandomness();
  console.log("Generated zkLogin randomness", randomness);
  const nonce = generateNonce(
    ephemeralKeypair.getPublicKey(),
    maxEpoch,
    randomness,
  );

  console.log("Generated zkLogin nonce", nonce);
  const state: EphemeralState = {
    secretKey: ephemeralKeypair.getSecretKey(),
    maxEpoch,
    randomness,
  };
  sessionStorage.setItem(EPHEMERAL_KEY, JSON.stringify(state));

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    response_type: "id_token",
    scope: "openid email profile",
    redirect_uri: window.location.origin,
    nonce,
  });

  window.location.href = `${GOOGLE_OAUTH_URL}?${params.toString()}`;
}

// id_token responses always come back in the URL fragment, e.g. "#id_token=eyJ...&..."
export function readIdTokenFromHash(): string | null {
  const raw = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!raw) return null;
  return new URLSearchParams(raw).get("id_token");
}

export function clearOAuthHash(): void {
  history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
}

export function getEphemeralState(): EphemeralState | null {
  const raw = sessionStorage.getItem(EPHEMERAL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EphemeralState;
  } catch {
    return null;
  }
}

export function clearEphemeralState(): void {
  sessionStorage.removeItem(EPHEMERAL_KEY);
}
