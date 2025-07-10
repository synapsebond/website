import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { base } from 'viem/chains'

import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  midnightTheme,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';

const queryClient = new QueryClient()
const config = getDefaultConfig({
  appName: 'Synapse Protocol',
  chains: [base],
  projectId: 'ec3d44586488da65eb148d3008679c72',
  ssr: false,
  transports: {
    [base.id]: "http://localhost:8545"
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
