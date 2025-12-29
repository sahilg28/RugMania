'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { formatEther } from 'viem'

interface PlayerStats {
  totalGames: number
  totalWagered: bigint
  netProfitLoss: bigint
}

interface PlayerStatsCardsProps {
  address: string
}

export function PlayerStatsCards({ address }: PlayerStatsCardsProps) {
  const [stats, setStats] = useState<PlayerStats>({
    totalGames: 0,
    totalWagered: BigInt(0),
    netProfitLoss: BigInt(0)
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!address) return
      
      try {
        const response = await fetch(`/api/player-stats?address=${address}`)
        if (response.ok) {
          const data = await response.json()
          setStats({
            totalGames: data.totalGames || 0,
            totalWagered: BigInt(data.totalWagered || '0'),
            netProfitLoss: BigInt(data.netProfitLoss || '0')
          })
        }
      } catch (error) {
        console.error('Failed to fetch player stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [address])

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K'
    }
    return num.toString()
  }

  const formatMNT = (wei: bigint) => {
    const value = parseFloat(formatEther(wei))
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(2) + 'K'
    }
    return value.toFixed(2)
  }

  const cards = [
    {
      label: 'Total Games Played',
      value: formatNumber(stats.totalGames),
      color: 'bg-main'
    },
    {
      label: 'Total Volume Wagered',
      value: formatMNT(stats.totalWagered),
      suffix: '◈',
      color: 'bg-main'
    },
    {
      label: 'Net Profit or Loss',
      value: (stats.netProfitLoss >= 0 ? '+' : '') + formatMNT(stats.netProfitLoss),
      suffix: '◈',
      color: stats.netProfitLoss >= 0 ? 'bg-main' : 'bg-red-500',
      textColor: stats.netProfitLoss >= 0 ? 'text-black' : 'text-white'
    }
  ]

  return (
    <div className="space-y-3">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`${card.color} border-2 border-black rounded-base p-4 shadow-brutal`}
        >
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-black/20 rounded w-20 mb-1" />
              <div className="h-4 bg-black/20 rounded w-32" />
            </div>
          ) : (
            <>
              <div className={`text-2xl font-black ${card.textColor || 'text-black'}`}>
                {card.value} {card.suffix && <span className="text-lg">{card.suffix}</span>}
              </div>
              <div className={`text-sm font-medium ${card.textColor ? 'text-white/80' : 'text-black/70'}`}>
                {card.label}
              </div>
            </>
          )}
        </motion.div>
      ))}
    </div>
  )
}
