'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePrivy } from '@privy-io/react-auth'
import { Wallet, LogOut, ArrowUpRight, Pencil, Menu, X, HelpCircle, FileText, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GameWalletChip } from '@/components/wallet/GameWalletChip'
import { useEmbeddedWallet } from '@/hooks/useEmbeddedWallet'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface HeaderProps {
  isGame?: boolean
  isDemo?: boolean
  isLanding?: boolean
  onExit?: () => void
  onOpenHowItWorks?: () => void
}

export function Header({ isGame = false, isDemo = false, isLanding = false, onExit, onOpenHowItWorks }: HeaderProps) {
  const { login, logout, ready, authenticated } = usePrivy()
  const { address: embeddedAddress } = useEmbeddedWallet()
  const router = useRouter()
  const [username, setUsername] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Load username from localStorage
  useEffect(() => {
    if (embeddedAddress) {
      const stored = localStorage.getItem(`rugmania_profile_${embeddedAddress}`)
      if (stored) {
        const profile = JSON.parse(stored)
        setUsername(profile.username)
      }
    }
  }, [embeddedAddress])

  const handleExit = () => {
    if (onExit) {
      onExit()
    } else {
      logout()
    }
  }

  const showGameHeader = (isGame || authenticated || isDemo) && !isLanding

  return (
    <header 
      className={`${isGame ? 'shrink-0' : 'fixed top-0 left-0 right-0'} z-50 border-b border-zinc-800/50 relative`} 
      style={{ backgroundColor: 'var(--color-bg-dark)' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          {/* Left - Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="hidden sm:block">
              <Button size="sm">
                Game
              </Button>
            </Link>
            
            {/* Mobile Logo */}
            <motion.div 
              className="flex sm:hidden items-center gap-1.5"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-7 h-7 bg-main flex items-center justify-center border-2 border-black rounded-base shadow-brutal-sm">
                <span className="text-black font-black text-sm">R</span>
              </div>
            </motion.div>
          </div>

          {/* Center - Logo (Desktop only) */}
          <motion.div 
            className="hidden sm:flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-9 h-9 bg-main flex items-center justify-center border-2 border-black rounded-base shadow-brutal-sm">
              <span className="text-black font-black text-lg">R</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">RUGMANIA</span>
          </motion.div>

          {/* Right - Auth/Wallet */}
          <motion.div
            className="flex items-center gap-1.5 sm:gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {isDemo ? (
              /* DEMO MODE */
              <>
                <Button onClick={login} disabled={!ready} size="sm">
                  <Wallet className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
                {/* Mobile Hamburger for Demo */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-white hover:border-zinc-600 transition-colors"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </>
            ) : showGameHeader ? (
              /* REAL GAME - Full wallet controls */
              <>
                {/* Embedded Wallet Balance + Add/Withdraw */}
                <GameWalletChip />
                
                {/* Desktop: Username/Address - Click to go to Profile */}
                <button
                  onClick={() => router.push('/profile')}
                  className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 hover:border-main transition-colors group"
                  title="View Profile"
                >
                  <span className="text-white font-semibold text-sm">
                    {username || (embeddedAddress ? `${embeddedAddress.slice(0, 4)}...${embeddedAddress.slice(-4)}` : '0x00...00')}
                  </span>
                  <Pencil className="w-3 h-3 text-zinc-500 group-hover:text-main transition-colors" />
                </button>
                
                {/* Desktop: External Link - View on Explorer */}
                <button 
                  title="View on Explorer"
                  onClick={() => embeddedAddress && window.open(`https://sepolia.mantlescan.xyz/address/${embeddedAddress}`, '_blank')}
                  className="hidden lg:flex w-9 h-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-white hover:border-zinc-600 transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                
                {/* Desktop: Exit */}
                <button
                  title="Exit Game"
                  onClick={handleExit}
                  className="hidden lg:flex w-9 h-9 items-center justify-center rounded-md bg-red-500 border-2 border-black text-white hover:bg-red-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                {/* Mobile/Tablet: Hamburger Menu */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-white hover:border-zinc-600 transition-colors"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </>
            ) : (
              /* LANDING PAGE - Sign In button */
              <Button onClick={login} disabled={!ready} size="sm">
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden absolute top-full right-3 mt-1 w-52 bg-white border-2 border-black rounded-lg shadow-brutal z-[100] overflow-hidden"
          >
            {/* Profile - Only show if authenticated */}
            {showGameHeader && !isDemo && (
              <button
                onClick={() => {
                  router.push('/profile')
                  setMobileMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-black hover:bg-zinc-100 transition-colors border-b border-zinc-200"
              >
                <Pencil className="w-4 h-4 text-zinc-600" />
                <span className="text-sm font-medium">
                  {username || (embeddedAddress ? `${embeddedAddress.slice(0, 6)}...${embeddedAddress.slice(-4)}` : 'Profile')}
                </span>
              </button>
            )}

            {/* How It Works */}
            {onOpenHowItWorks && (
              <button
                onClick={() => {
                  onOpenHowItWorks()
                  setMobileMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-black hover:bg-zinc-100 transition-colors border-b border-zinc-200"
              >
                <HelpCircle className="w-4 h-4 text-zinc-600" />
                <span className="text-sm font-medium">How It Works</span>
              </button>
            )}

            {/* Docs */}
            <a
              href="https://docs.rugmania.xyz"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 text-black hover:bg-zinc-100 transition-colors border-b border-zinc-200"
            >
              <FileText className="w-4 h-4 text-zinc-600" />
              <span className="text-sm font-medium">Docs</span>
            </a>

            {/* View on Explorer - Only show if authenticated */}
            {showGameHeader && !isDemo && embeddedAddress && (
              <button
                onClick={() => {
                  window.open(`https://sepolia.mantlescan.xyz/address/${embeddedAddress}`, '_blank')
                  setMobileMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-black hover:bg-zinc-100 transition-colors border-b border-zinc-200"
              >
                <ExternalLink className="w-4 h-4 text-zinc-600" />
                <span className="text-sm font-medium">View on Explorer</span>
              </button>
            )}

            {/* Social Links */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200">
              <span className="text-xs text-zinc-500 font-medium">Follow us:</span>
              <a
                href="https://twitter.com/rugmania"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://discord.gg/rugmania"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#5865F2] hover:bg-[#4752C4] transition-colors"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
            </div>

            {/* Exit - Only show if authenticated */}
            {showGameHeader && !isDemo && (
              <button
                onClick={() => {
                  handleExit()
                  setMobileMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Exit Game</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay to close menu */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-[99]" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </header>
  )
}
