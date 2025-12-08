'use client'

import { motion } from 'framer-motion'
import { usePrivy } from '@privy-io/react-auth'
import { useAccount } from 'wagmi'
import { Wallet, LogOut, Plus, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface HeaderProps {
  isGame?: boolean
  isDemo?: boolean
  balance?: number
  onExit?: () => void
}

export function Header({ isGame = false, isDemo = false, balance = 0, onExit }: HeaderProps) {
  const { login, logout, ready, authenticated } = usePrivy()
  const { address } = useAccount()

  const handleExit = () => {
    if (onExit) {
      onExit()
    } else {
      logout()
    }
  }

  const showGameHeader = isGame || authenticated || isDemo

  return (
    <header 
      className={`${isGame ? 'shrink-0' : 'fixed top-0 left-0 right-0'} z-50 border-b border-zinc-800/50`} 
      style={{ backgroundColor: 'var(--color-bg-dark)' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left - Navigation */}
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button size="sm">
                Game
              </Button>
            </Link>
          </div>

          {/* Center - Logo */}
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-9 h-9 bg-main flex items-center justify-center border-2 border-black rounded-base shadow-brutal-sm">
              <span className="text-black font-black text-lg">R</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight hidden sm:block">RUGMANIA</span>
          </motion.div>

          {/* Right - Auth/Wallet */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {isDemo ? (
              /* DEMO MODE - Just Sign In button */
              <Button onClick={login} disabled={!ready}>
                <Wallet className="w-4 h-4" />
                Sign In
              </Button>
            ) : showGameHeader ? (
              /* REAL GAME - Full wallet controls */
              <>
                {/* Wallet Balance */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900">
                  <Wallet className="w-4 h-4 text-main" />
                  <span className="text-white font-semibold text-sm">{balance.toFixed(2)} MNT</span>
                </div>
                {/* Add Funds */}
                <button 
                  title="Add Funds"
                  className="w-9 h-9 flex items-center justify-center rounded-md bg-lime-400 border-2 border-black text-black hover:bg-lime-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {/* Address */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900">
                  <span className="text-white font-semibold text-sm">
                    {address ? `${address.slice(0, 4)}...${address.slice(-4)}` : '0x00...00'}
                  </span>
                </div>
                {/* External Link - View on Explorer */}
                <button 
                  title="View on Explorer"
                  onClick={() => address && window.open(`https://sepolia.mantlescan.xyz/address/${address}`, '_blank')}
                  className="w-9 h-9 flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-white hover:border-zinc-600 transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                {/* Exit */}
                <button
                  title="Exit Game"
                  onClick={handleExit}
                  className="w-9 h-9 flex items-center justify-center rounded-md bg-red-500 border-2 border-black text-white hover:bg-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              /* LANDING PAGE - Sign In button */
              <Button onClick={login} disabled={!ready}>
                <Wallet className="w-4 h-4" />
                Sign In
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </header>
  )
}
