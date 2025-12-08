import { defineChain } from 'viem'
import { http, createConfig } from 'wagmi'

export const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MNT',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia.mantle.xyz'] },
    public: { http: ['https://rpc.sepolia.mantle.xyz'] },
  },
  blockExplorers: {
    default: { 
      name: 'Mantle Explorer', 
      url: 'https://explorer.sepolia.mantle.xyz' 
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
