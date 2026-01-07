'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { RefreshCw, Loader2 } from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  address: string
  displayName: string
  wins: number
  games: number
}

interface LeaderboardProps {
  animated?: boolean
  className?: string
}

export function Leaderboard({ animated = false, className }: LeaderboardProps) {
  const [tab, setTab] = useState<'weekly' | 'alltime'>('weekly')
  const [players, setPlayers] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/leaderboard?period=${tab}`)
      const data = await response.json()
      
      if (data.error && !data.players) {
        throw new Error(data.error)
      }
      
      setPlayers(data.players || [])
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchLeaderboard, 60000)
    return () => clearInterval(interval)
  }, [tab])

  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-base uppercase tracking-widest">
          LEADERBOARD
        </h3>
        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={cn("w-4 h-4 text-zinc-400", loading && "animate-spin")} />
        </button>
      </div>
      
      <div className="flex rounded-lg mb-3 overflow-hidden border-2 border-zinc-700">
        <button
          onClick={() => setTab('weekly')}
          className={cn(
            "flex-1 py-2 text-sm font-bold uppercase tracking-wide transition-all",
            tab === 'weekly' 
              ? "bg-lime-400 text-black" 
              : "bg-zinc-800 text-zinc-400 hover:text-white"
          )}
        >
          Weekly
        </button>
        <button
          onClick={() => setTab('alltime')}
          className={cn(
            "flex-1 py-2 text-sm font-bold uppercase tracking-wide transition-all",
            tab === 'alltime' 
              ? "bg-lime-400 text-black" 
              : "bg-zinc-800 text-zinc-400 hover:text-white"
          )}
        >
          All Time
        </button>
      </div>

      <div className="flex-1 bg-zinc-800 rounded-lg overflow-hidden flex flex-col border-2 border-zinc-700">
        <div className="grid grid-cols-4 gap-2 text-[11px] text-zinc-400 font-semibold px-4 py-2.5 border-b border-zinc-700 uppercase">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Wins</span>
          <span className="text-right">Games</span>
        </div>

        <div className="flex-1 overflow-y-auto min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center h-full py-8">
              <Loader2 className="w-6 h-6 text-lime-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-zinc-500">
              <p className="text-sm">{error}</p>
              <button 
                onClick={fetchLeaderboard}
                className="mt-2 text-lime-400 text-sm hover:underline"
              >
                Try again
              </button>
            </div>
          ) : players.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-zinc-500">
              <p className="text-sm text-center px-4">
                {tab === 'weekly' 
                  ? "No players this week yet. Be the first!" 
                  : "No players yet. Be the first to play!"}
              </p>
            </div>
          ) : (
            players.map((entry) => (
              <div
                key={entry.address}
                className="grid grid-cols-4 gap-2 items-center px-4 py-2.5 border-b border-zinc-700/50 last:border-0 hover:bg-lime-400/10 transition-colors"
              >
                <span className={cn(
                  "text-sm font-bold",
                  entry.rank <= 3 ? "text-lime-400" : "text-zinc-500"
                )}>
                  {entry.rank}
                </span>
                <span 
                  className="text-sm font-semibold truncate text-white"
                  title={entry.address}
                >
                  {entry.displayName}
                </span>
                <span className="text-lime-400 text-sm font-bold text-right">
                  {entry.wins}
                </span>
                <span className="text-zinc-400 text-sm text-right">
                  {entry.games}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )

  const baseClass = cn("h-full flex flex-col rounded-xl border-2 border-lime-400 bg-zinc-900 p-4", className)

  if (animated) {
    return (
      <motion.div
        className={baseClass}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {content}
      </motion.div>
    )
  }

  return <div className={baseClass}>{content}</div>
}
