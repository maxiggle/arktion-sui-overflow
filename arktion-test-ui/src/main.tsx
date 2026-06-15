import { Buffer } from 'buffer';
// @mysten/sui touches Node-style Buffer in some code paths.
if (!('Buffer' in globalThis)) {
  (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import './index.css';
import App from './App.tsx';
import { SUI_NETWORK } from './lib/sui';

const queryClient = new QueryClient();

const dAppKit = createDAppKit({
  networks: [SUI_NETWORK],
  defaultNetwork: SUI_NETWORK,
  createClient: (network) =>
    new SuiJsonRpcClient({ network, url: getJsonRpcFullnodeUrl(network) }),
  autoConnect: false,
  enableBurnerWallet: false,
  slushWalletConfig: null,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        <App />
      </DAppKitProvider>
    </QueryClientProvider>
  </StrictMode>,
);
