import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

export const SUI_NETWORK = (import.meta.env.VITE_SUI_NETWORK ?? 'testnet') as SuiNetwork;

// A direct JSON-RPC client used by the zkLogin flow to read the current epoch.
// The five API sections talk to the NestJS backend, not the chain directly.
export const suiClient = new SuiJsonRpcClient({
  network: SUI_NETWORK,
  url: getJsonRpcFullnodeUrl(SUI_NETWORK),
});
