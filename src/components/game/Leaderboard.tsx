'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  name: string
  wins: number
  games: number
}

const MOCK_DATA: LeaderboardEntry[] = [
  { rank: 1, name: 'Mik', wins: 38, games: 49 },
  { rank: 2, name: 'marcel', wins: 112, games: 144 },
  { rank: 3, name: 'r@$tA', wins: 79, games: 103 },
  { rank: 4, name: 'joe', wins: 134, games: 176 },
  { rank: 5, name: '0xce...869F', wins: 32, games: 48 },
  { rank: 6, name: 'SpawN', wins: 41, games: 63 },
  { rank: 7, name: 'mama', wins: 45, games: 62 },
  { rank: 8, name: '0xPixhel', wins: 38, games: 54 },
  { rank: 9, name: '0x21...30D9', wins: 5, games: 7 },
]

interface LeaderboardProps {
  animated?: boolean
  className?: string
}

export function Leaderboard({ animated = false, className }: LeaderboardProps) {
  const [tab, setTab] = useState<'weekly' | 'alltime'>('weekly')

  const content = (
    <>
      <h3 className="text-white font-bold text-base mb-3 text-center uppercase tracking-widest">
        Leaderboard
      </h3>
      
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
          <span>Name</span>
          <span className="text-right">Wins</span>
          <span className="text-right">Games</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {MOCK_DATA.map((entry) => (
            <div
              key={entry.rank}
              className="grid grid-cols-4 gap-2 items-center px-4 py-2.5 border-b border-zinc-700/50 last:border-0 hover:bg-lime-400/10 transition-colors"
            >
              <span className={cn(
                "text-sm font-bold",
                entry.rank <= 3 ? "text-lime-400" : "text-zinc-500"
              )}>{entry.rank}</span>
              <span className="text-sm font-semibold truncate text-white">{entry.name}</span>
              <span className="text-lime-400 text-sm font-bold text-right">{entry.wins}</span>
              <span className="text-zinc-400 text-sm text-right">{entry.games}</span>
            </div>
          ))}
        </div>

        <div className="bg-lime-400 px-4 py-2 flex items-center justify-center border-t border-zinc-700">
          <ChevronDown className="w-4 h-4 text-black" />
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
