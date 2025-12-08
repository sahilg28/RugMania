# RugDoor - Onchain Door Game on Mantle

A provably fair, multiplier-based door selection game built on Mantle Testnet. Pick doors, avoid the rug, multiply your winnings.

## Features

- **Provably Fair** - Cryptographic verification ensures transparent gameplay
- **Multiple Difficulties** - 2-5 doors with varying risk/reward ratios
- **Neobrutalism UI** - Bold design with smooth Framer Motion animations
- **Privy Auth** - Login via email, social accounts, or crypto wallets
- **Demo Mode** - Try the game without connecting a wallet
- **Real Leaderboard** - See top players and their stats

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── globals.css         # Global styles & Tailwind
│   ├── layout.tsx          # Root layout with providers
│   └── page.tsx            # Main entry (landing/game)
├── components/
│   ├── game/               # Game components
│   │   ├── RugRumbleGameBoard.tsx
│   │   ├── RugDoor.tsx
│   │   ├── Leaderboard.tsx
│   │   └── ...
│   ├── landing/            # Landing page components
│   │   ├── Header.tsx
│   │   ├── GamePreview.tsx
│   │   ├── LandingLeaderboard.tsx
│   │   ├── CTASection.tsx
│   │   └── Footer.tsx
│   ├── ui/                 # Reusable UI components
│   │   └── Button.tsx
│   └── wallet/             # Wallet components
│       └── ConnectButton.tsx
├── config/
│   └── chains.ts           # Chain configuration (Mantle Sepolia)
├── lib/
│   └── utils.ts            # Utility functions
├── providers/
│   └── Providers.tsx       # App providers (Privy, Wagmi, React Query)
└── types/
    └── game.ts             # TypeScript types
```

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp env.local.config .env.local

# Run development server
npm run dev
```

## Environment Variables

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=5003
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling with neobrutalism design
- **Framer Motion** - Animations
- **Privy** - Web3 authentication
- **Wagmi + Viem** - Ethereum interactions
- **Mantle Sepolia** - Testnet blockchain

## Game Flow

1. Landing page shows game preview with animated doors
2. User clicks "Sign In" → Privy auth modal (Mantle testnet)
3. User clicks "Play Demo" → Demo mode without wallet
4. After auth → Game board with betting interface
5. Pick doors to advance levels, avoid the rug door
6. Cash out anytime after level 1

## Development Roadmap

- [x] Landing page UI
- [x] Game preview animation
- [x] Leaderboard display
- [x] Demo mode
- [ ] Smart contract integration
- [ ] Real betting with MNT
- [ ] Provably fair verification
- [ ] Lottery system
- [ ] Referral system

---

Built for Web3 gaming on Mantle
