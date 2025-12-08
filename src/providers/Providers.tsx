'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig, mantleSepolia } from '@/config/chains'
import { ReactNode } from 'react'

const queryClient = new QueryClient()

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  // Get Privy app ID from environment variable (will be added later)
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'placeholder'

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
          appId={privyAppId}
          config={{
            loginMethods: ['email', 'wallet', 'google', 'twitter'],
            appearance: {
              theme: 'dark',
              accentColor: '#c8ff00',
              logo: '/logo.png',
              showWalletLoginFirst: false,
            },
            embeddedWallets: {
              ethereum: {
                createOnLogin: 'users-without-wallets',
              },
            },
            defaultChain: mantleSepolia,
            supportedChains: [mantleSepolia],
            walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
          }}
        >
          {children}
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
