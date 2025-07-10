import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { base } from 'viem/chains'

const config = getDefaultConfig({
  appName: 'Synapse Protocol',
  chains: [base],
  projectId: 'ec3d44586488da65eb148d3008679c72',
  ssr: false,
  transports: {
    [base.id]: http("http://localhost:8545")
  }
});

export default config;