'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { formatEther } from 'viem'

interface GameRecord {
  gameId: string
  status: 'Win' | 'Loss'
  wagered: bigint
  winnings: bigint
}

interface GameHistoryTableProps {
  address: string
}

export function GameHistoryTable({ address }: GameHistoryTableProps) {
  const [games, setGames] = useState<GameRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [displayCount, setDisplayCount] = useState(20)

  useEffect(() => {
    const fetchGameHistory = async () => {
      if (!address) return
      
      try {
        // Fetch game history from API
        const response = await fetch(`/api/game-history?address=${address}`)
        if (response.ok) {
          const data = await response.json()
          setGames(data.games || [])
        }
      } catch (error) {
        console.error('Failed to fetch game history:', error)
        setGames([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchGameHistory()
  }, [address])

  const formatMNT = (wei: bigint) => {
    return parseFloat(formatEther(wei)).toFixed(2)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setDisplayCount(prev => Math.min(prev + 20, games.length))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white border-2 border-black rounded-base overflow-hidden shadow-brutal"
    >
      {/* Table Header */}
      <div className="grid grid-cols-4 gap-4 px-4 py-3 bg-zinc-100 border-b-2 border-black text-sm font-bold text-zinc-600 uppercase">
        <div>Game ID</div>
        <div>Status</div>
        <div>Wagered</div>
        <div>Winnings</div>
      </div>

      {/* Table Body */}
      <div 
        className="max-h-[500px] overflow-y-auto"
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="p-8 text-center text-zinc-500">
            <div className="animate-pulse">Loading game history...</div>
          </div>
        ) : games.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            No games played yet
          </div>
        ) : (
          <>
            {games.slice(0, displayCount).map((game, index) => (
              <div
                key={game.gameId + index}
                className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                <div className="font-mono text-zinc-700">{game.gameId}</div>
                <div>
                  <span className={`font-bold ${game.status === 'Win' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {game.status}
                  </span>
                </div>
                <div className="font-mono text-zinc-700">
                  {formatMNT(game.wagered)} <span className="text-zinc-400">◈</span>
                </div>
                <div className={`font-mono font-bold ${game.winnings >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {game.winnings >= 0 ? '+' : ''}{formatMNT(game.winnings)} <span className="opacity-70">◈</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      {games.length > 0 && (
        <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-200 text-center text-sm text-zinc-500">
          Showing {Math.min(displayCount, games.length)} of {games.length} games • Scroll for more
        </div>
      )}
    </motion.div>
  )
}
