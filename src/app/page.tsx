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
    <div className="min-h-screen bg-grid flex flex-col" style={{ backgroundColor: 'var(--color-bg-dark)' }}>
      <Header />
      
      <main className="flex-1 pt-20 pb-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Game Preview + CTA - Stacked */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="flex-1">
                <GamePreview />
              </div>
              <CTASection onPlayDemo={handlePlayDemo} />
            </div>
            
            {/* Leaderboard - Matches height */}
            <div className="lg:col-span-4">
              <Leaderboard animated />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
