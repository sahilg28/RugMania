import { defineChain } from 'viem'
import { http, createConfig } from 'wagmi'

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
      http: ['https://rpc.sepolia.mantle.xyz'],
      webSocket: ['wss://rpc.sepolia.mantle.xyz']
    },
    public: { 
      http: ['https://rpc.sepolia.mantle.xyz'],
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
    [mantleSepolia.id]: http(),
  },
})

// Contract addresses (will be updated when deployed)
export const CONTRACT_ADDRESSES = {
  doorRunner: '0x0000000000000000000000000000000000000000', // Update after deployment
} as const
