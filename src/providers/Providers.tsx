'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig, mantleSepolia } from '@/config/chains'
import { ReactNode, useState } from 'react'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  // Create QueryClient instance lazily to avoid React 19 hydration issues
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  }))

  // Get Privy app ID from environment variable
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'placeholder'

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
          appId={privyAppId}
          config={{
            loginMethods: ['wallet'],
            appearance: {
              theme: 'dark',
              accentColor: '#c8ff00',
              logo: '/logo.png',
              showWalletLoginFirst: true,
            },
            embeddedWallets: {
              createOnLogin: 'all-users',
              requireUserPasswordOnCreate: false,
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
