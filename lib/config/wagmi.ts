import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { getDefaultConfig } from 'connectkit';

export const config = createConfig(
  getDefaultConfig({
    chains: [base],
    transports: {
      [base.id]: http(),
    },
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    appName: 'Pendle Yield Navigator',
    appDescription: 'One-stop solution for Pendle stablecoin yield strategies',
    appUrl: 'https://pendle-yield-navigator.com',
    appIcon: 'https://pendle-yield-navigator.com/icon.png',
  })
);

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
