'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Header, GamePreview, CTASection, Footer } from '@/components/landing'
import { GameBoard } from '@/components/game/GameBoard'
import { Leaderboard } from '@/components/game/Leaderboard'
import { Loading } from '@/components/ui/Loading'

export default function Home() {
  const { authenticated, ready } = usePrivy()
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)

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
      <Header isGame isLanding />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-3 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* Game Preview + CTA - Stacked */}
          <div className="lg:col-span-8 flex flex-col gap-3 h-full">
            <div className="flex-1 min-h-0">
              <GamePreview />
            </div>
            <CTASection onPlayDemo={handlePlayDemo} />
          </div>
          
          {/* Leaderboard - Matches height */}
          <div className="lg:col-span-4 h-full">
            <Leaderboard animated />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
