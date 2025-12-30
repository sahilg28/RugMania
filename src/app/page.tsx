'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Header, GamePreview, CTASection, Footer } from '@/components/landing'
import { GameBoard } from '@/components/game/GameBoard'
import { Leaderboard } from '@/components/game/Leaderboard'
import { Loading } from '@/components/ui/Loading'
import { HowItWorksModal } from '@/components/modals/HowItWorksModal'

export default function Home() {
  const { authenticated, ready } = usePrivy()
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [activeTab, setActiveTab] = useState<'game' | 'leaderboard'>('game')

  useEffect(() => {
    if (ready) {
      const timer = setTimeout(() => setIsLoading(false), 800)
      return () => clearTimeout(timer)
    }
  }, [ready])

  const handlePlayDemo = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setIsDemoMode(true)
      setIsTransitioning(false)
    }, 600)
  }

  const handleExitDemo = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setIsDemoMode(false)
      setIsTransitioning(false)
    }, 600)
  }

  if (isLoading || !ready || isTransitioning) {
    return <Loading />
  }

  if (authenticated || isDemoMode) {
    return <GameBoard isDemo={isDemoMode} onExitDemo={handleExitDemo} />
  }

  return (
    <div className="h-screen bg-grid flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-bg-dark)' }}>
      <Header isGame isLanding onOpenHowItWorks={() => setShowHowItWorks(true)} />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-4 py-2 sm:py-3 overflow-hidden flex flex-col">
        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 h-full">
          <div className="lg:col-span-8 flex flex-col gap-4">
            <GamePreview />
            <CTASection onPlayDemo={handlePlayDemo} />
          </div>
          <div className="lg:col-span-4 h-full">
            <Leaderboard animated className="lg:h-full" />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="flex lg:hidden flex-col flex-1 overflow-hidden">
          {activeTab === 'game' ? (
            <div className="flex flex-col flex-1">
              <div className="flex-1 min-h-0 max-h-[62vh]">
                <GamePreview />
              </div>
              <div className="shrink-0 mt-3 mb-3">
                <CTASection onPlayDemo={handlePlayDemo} />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <Leaderboard animated={false} />
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden shrink-0 border-t-2 border-lime-400 bg-lime-400">
        <div className="flex">
          <button
            onClick={() => setActiveTab('game')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
              activeTab === 'game' ? 'bg-lime-500' : 'bg-lime-400'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              activeTab === 'game' ? 'bg-purple-600' : 'bg-zinc-800'
            }`}>
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="8" cy="12" r="2" fill="currentColor" />
                <path d="M14 10h4M16 8v4" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <span className={`text-[10px] font-bold ${activeTab === 'game' ? 'text-black' : 'text-zinc-700'}`}>GAME</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
              activeTab === 'leaderboard' ? 'bg-lime-500' : 'bg-lime-400'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              activeTab === 'leaderboard' ? 'bg-purple-600' : 'bg-zinc-800'
            }`}>
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM17 3a2 2 0 00-2 2v14a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2z" />
              </svg>
            </div>
            <span className={`text-[10px] font-bold ${activeTab === 'leaderboard' ? 'text-black' : 'text-zinc-700'}`}>LEADERBOARD</span>
          </button>
        </div>
      </div>

      {/* Footer - Hidden on mobile */}
      <div className="hidden lg:block">
        <Footer onOpenHowItWorks={() => setShowHowItWorks(true)} />
      </div>
      
      <HowItWorksModal 
        isOpen={showHowItWorks} 
        onClose={() => setShowHowItWorks(false)} 
      />
    </div>
  )
}
