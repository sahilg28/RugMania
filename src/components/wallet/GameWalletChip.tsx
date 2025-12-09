'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Plus, ArrowDownToLine } from 'lucide-react'
import { createPublicClient, http, formatEther, type Address } from 'viem'
import { mantleSepolia } from '@/config/chains'
import { useEmbeddedWallet } from '@/hooks/useEmbeddedWallet'
import { AddFundsModal } from './AddFundsModal'
import { WithdrawModal } from './WithdrawModal'

// Create a public client for reading balance
const publicClient = createPublicClient({
  chain: mantleSepolia,
  transport: http('https://rpc.sepolia.mantle.xyz'),
})

export function GameWalletChip() {
  const { address, walletClient, isLoading } = useEmbeddedWallet()
  const [balance, setBalance] = useState<bigint>(BigInt(0))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)

  // Fetch balance
  const fetchBalance = async () => {
    if (!address) return
    
    try {
      const bal = await publicClient.getBalance({ address })
      setBalance(bal)
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    }
  }

  // Initial fetch and polling
  useEffect(() => {
    if (address) {
      fetchBalance()
      // Poll every 10 seconds
      const interval = setInterval(fetchBalance, 10000)
      return () => clearInterval(interval)
    }
  }, [address])

  // Refresh balance manually
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchBalance()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Handle withdrawal transaction
  const handleWithdraw = async (toAddress: Address, amount: bigint) => {
    if (!walletClient || !address) throw new Error('Wallet client not ready')

    const hash = await walletClient.sendTransaction({
      account: address,
      to: toAddress,
      value: amount,
      chain: mantleSepolia,
    })

    console.log('Withdrawal transaction hash:', hash)
    
    // Wait a bit and refresh balance
    setTimeout(() => {
      fetchBalance()
    }, 2000)
  }

  if (isLoading || !address) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900">
        <Wallet className="w-4 h-4 text-zinc-500 animate-pulse" />
        <span className="text-zinc-500 font-semibold text-sm">Loading...</span>
      </div>
    )
  }

  const balanceInMNT = parseFloat(formatEther(balance))

  return (
    <>
      <motion.div 
        className="flex items-center gap-2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Balance Display */}
        <button
          onClick={handleRefresh}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 hover:border-main transition-colors ${
            isRefreshing ? 'animate-pulse' : ''
          }`}
          title="Click to refresh balance"
        >
          <Wallet className="w-4 h-4 text-main" />
          <span className="text-white font-semibold text-sm">
            {balanceInMNT.toFixed(4)} MNT
          </span>
        </button>

        {/* Add Funds Button */}
        <button
          onClick={() => setIsAddFundsOpen(true)}
          title="Add Funds"
          className="w-9 h-9 flex items-center justify-center rounded-md bg-main border-2 border-black text-black hover:bg-lime-300 transition-colors shadow-brutal-sm"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Withdraw Button */}
        <button
          onClick={() => setIsWithdrawOpen(true)}
          title="Withdraw"
          className="w-9 h-9 flex items-center justify-center rounded-md bg-main border-2 border-black text-black hover:bg-lime-300 transition-colors shadow-brutal-sm"
        >
          <ArrowDownToLine className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Modals */}
      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => {
          setIsAddFundsOpen(false)
          handleRefresh()
        }}
        embeddedAddress={address}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => {
          setIsWithdrawOpen(false)
          handleRefresh()
        }}
        embeddedAddress={address}
        currentBalance={balance}
        onWithdraw={handleWithdraw}
      />
    </>
  )
}
