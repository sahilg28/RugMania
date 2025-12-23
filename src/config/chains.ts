import { defineChain } from 'viem'
import { http, fallback, createConfig } from 'wagmi'

// Mantle Sepolia Testnet - Complete config for Privy compatibility
export const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia Testnet',
  network: 'mantle-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'MNT',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: { 
      http: [
        'https://rpc.sepolia.mantle.xyz',
        'https://mantle-sepolia.blockpi.network/v1/rpc/public',
        'https://rpc.ankr.com/mantle_sepolia'
      ],
      webSocket: ['wss://rpc.sepolia.mantle.xyz']
    },
    public: { 
      http: [
        'https://rpc.sepolia.mantle.xyz',
        'https://mantle-sepolia.blockpi.network/v1/rpc/public',
        'https://rpc.ankr.com/mantle_sepolia'
      ],
      webSocket: ['wss://rpc.sepolia.mantle.xyz']
    },
  },
  blockExplorers: {
    default: { 
      name: 'Mantle Sepolia Explorer', 
      url: 'https://sepolia.mantlescan.xyz',
      apiUrl: 'https://api-sepolia.mantlescan.xyz/api'
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 1620204,
    },
  },
  testnet: true,
})


export const wagmiConfig = createConfig({
  chains: [mantleSepolia],
  transports: {
    [mantleSepolia.id]: fallback([
      http('https://rpc.sepolia.mantle.xyz', {
        retryCount: 3,
        retryDelay: 1000,
        timeout: 30000,
      }),
      http('https://mantle-sepolia.blockpi.network/v1/rpc/public', {
        retryCount: 1,
        retryDelay: 5000,
        timeout: 10000,
      }),
      http('https://rpc.ankr.com/mantle_sepolia', {
        retryCount: 1,
        retryDelay: 5000,
        timeout: 10000,
      }),
    ]),
  },
})

export const CONTRACT_ADDRESSES = {
  // doorRunner: '0x0000000000000000000000000000000000000000', // Update after deployment
  doorRunner: "0x3B909Be5ABD7861028Bf622b04cF205391D52125",
} as const;
