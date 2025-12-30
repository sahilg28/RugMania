'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { motion } from 'framer-motion'
import { ArrowLeft, Copy, Check, Pencil, X } from 'lucide-react'
import { useEmbeddedWallet } from '@/hooks/useEmbeddedWallet'
import { Button } from '@/components/ui/Button'
import { PlayerStatsCards } from '@/components/profile/PlayerStatsCards'
import { GameHistoryTable } from '@/components/profile/GameHistoryTable'
import { toHex } from 'viem'

interface UserProfile {
  username: string
  address: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { authenticated, ready } = usePrivy()
  const { address, embeddedWallet } = useEmbeddedWallet()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/')
    }
  }, [ready, authenticated, router])

  // Load profile from MongoDB
  useEffect(() => {
    if (address) {
      fetch(`/api/users?address=${address}`)
        .then((res) => res.json())
        .then((data) => {
          setProfile({ username: data.username, address: data.address });
        })
        .catch(() => {
          // Fallback to default
          setProfile({
            username: `${address.slice(0, 6)}...${address.slice(-4)}`,
            address: address,
          });
        });
    }
  }, [address]);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleEditUsername = () => {
    setNewUsername(profile?.username || '')
    setIsEditing(true)
  }

  const handleSaveUsername = async () => {
    if (!address || !newUsername.trim()) return;
    
    setIsSaving(true);
    try {
      if (!embeddedWallet) {
        alert('Wallet not connected')
        setIsSaving(false)
        return
      }

      const timestamp = Date.now()
      const normalizedAddress = address.toLowerCase()
      const trimmed = newUsername.trim()
      const message = `RugMania - Set Username\nAddress: ${normalizedAddress}\nUsername: ${trimmed}\nTimestamp: ${timestamp}`

      const provider = await embeddedWallet.getEthereumProvider()
      const signature = await provider.request({
        method: 'personal_sign',
        params: [toHex(message), normalizedAddress],
      })

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: normalizedAddress, username: trimmed, signature, timestamp }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Failed to save username');
        setIsSaving(false);
        return;
      }
      
      setProfile({ username: data.username, address });
      setIsEditing(false);
    } catch (error) {
      alert('Failed to save username');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false)
    setNewUsername('')
  }

  if (!ready || !authenticated || !address) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-dark)' }}>
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-dark)' }}>
      {/* Header */}
      <header className="border-b border-zinc-800/50 px-3 sm:px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <h1 className="text-white font-bold text-lg">Profile</h1>
          <div className="w-16 sm:w-20" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Username Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border-2 border-zinc-700 rounded-base p-4 sm:p-6"
            >
              {isEditing ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    maxLength={20}
                    className="w-full bg-zinc-800 border-2 border-zinc-700 rounded-base px-4 py-2 text-white font-bold text-lg sm:text-xl focus:border-main focus:outline-none"
                    placeholder="Enter username"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveUsername} disabled={isSaving || !newUsername.trim()}>
                      <Check className="w-4 h-4" />
                      Save
                    </Button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 rounded-base border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-black text-xl sm:text-2xl truncate pr-2">{profile?.username}</h2>
                  <button
                    onClick={handleEditUsername}
                    className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-base border-2 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                    title="Edit username"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* Wallet Address */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-zinc-400 font-mono text-xs sm:text-sm truncate">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="shrink-0 p-1.5 rounded hover:bg-zinc-800 transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-main" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-500" />
                  )}
                </button>
              </div>
            </motion.div>

            {/* Stats Cards */}
            <PlayerStatsCards address={address} />
          </div>

          {/* Right Column - Game History */}
          <div className="lg:col-span-2">
            <GameHistoryTable address={address} />
          </div>
        </div>
      </main>
    </div>
  )
}
