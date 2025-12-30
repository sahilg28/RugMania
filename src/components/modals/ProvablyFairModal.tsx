'use client'

import { Modal } from '@/components/ui/Modal'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { keccak256, toHex } from 'viem'

interface ProvablyFairModalProps {
  isOpen: boolean
  onClose: () => void
  clientSeed?: string
  serverSeedHash?: string
  serverSeed?: string
  isGameActive?: boolean
  onClientSeedChange?: (seed: string) => void
}

export function ProvablyFairModal({ 
  isOpen, 
  onClose, 
  clientSeed,
  serverSeedHash,
  serverSeed,
  isGameActive,
  onClientSeedChange
}: ProvablyFairModalProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [newClientSeed, setNewClientSeed] = useState('')
  const [, setCustomClientSeed] = useState<string | null>(null) // Used to trigger re-render
  
  // Get custom client seed from localStorage (read directly, no effect needed)
  const getCustomClientSeed = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('customClientSeed')
    }
    return null
  }

  // Get the current client seed to display
  const storedCustomSeed = getCustomClientSeed()
  const displayClientSeed = isGameActive ? clientSeed : (storedCustomSeed || clientSeed)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleUpdateClientSeed = () => {
    if (newClientSeed.length < 8) {
      alert('Client seed must be at least 8 characters')
      return
    }
    
    // Convert string to bytes32 format (keccak256 hash of the input)
    // This ensures it's always a valid bytes32 value
    const seedHash = keccak256(toHex(newClientSeed))
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('customClientSeed', seedHash)
      onClientSeedChange?.(seedHash)
      setNewClientSeed('')
      // Force re-render by updating state
      setCustomClientSeed(seedHash)
    }
  }

  const handleGenerateRandomSeed = () => {
    const array = new Uint8Array(32)
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array)
    }
    const hex = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
    const randomSeed = `0x${hex}`
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('customClientSeed', randomSeed)
      onClientSeedChange?.(randomSeed)
      setCustomClientSeed(randomSeed)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Provably Fair"
      subtitle="Verify game outcomes and manage your client seed"
    >
      <div className="space-y-6">
        {/* What is Provably Fair */}
        <div>
          <h3 className="text-white font-bold mb-2">What is Provably Fair?</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Provably fairness ensures that game outcomes are predetermined and cannot be manipulated. 
            Each game uses a combination of a server seed (hidden) and your client seed (visible) to 
            generate random results. After the game, you can verify that the outcome was fair.
          </p>
        </div>

        {/* Client Seed */}
        <div>
          <h3 className="text-white font-bold mb-2">Your Client Seed</h3>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-zinc-500 text-xs">Current Seed:</span>
              {displayClientSeed && (
                <span className="text-zinc-500 text-[10px]">
                  {isGameActive ? 'From active game' : storedCustomSeed ? 'Custom' : 'Auto-generated'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <code className="text-lime-400 text-sm font-mono flex-1 break-all">
                {displayClientSeed || 'No seed set'}
              </code>
              {displayClientSeed && (
                <button
                  onClick={() => copyToClipboard(displayClientSeed, 'client')}
                  className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                >
                  {copied === 'client' ? (
                    <Check className="w-4 h-4 text-lime-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              )}
            </div>
          </div>
          <p className="text-zinc-500 text-xs mt-2">
            This seed is combined with the server seed to generate game outcomes.
          </p>

          {/* Change Client Seed (only when not in active game) */}
          {!isGameActive && (
            <div className="mt-3 space-y-2">
              <h4 className="text-white font-semibold text-sm">Change Client Seed (Optional)</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newClientSeed}
                  onChange={(e) => setNewClientSeed(e.target.value)}
                  placeholder="Enter new client seed (min 8 characters)"
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-lime-400"
                />
                <button
                  onClick={handleUpdateClientSeed}
                  disabled={newClientSeed.length < 8}
                  className="px-4 py-2 bg-lime-400 text-black font-bold rounded-lg hover:bg-lime-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Update
                </button>
              </div>
              <button
                onClick={handleGenerateRandomSeed}
                className="w-full px-3 py-2 bg-zinc-700 text-white text-xs font-medium rounded-lg hover:bg-zinc-600 transition-colors"
              >
                Generate Random Seed
              </button>
              <p className="text-zinc-500 text-[10px] mt-1">
                You can change your client seed at any time. This will affect random outcomes of future games.
              </p>
            </div>
          )}
        </div>

        {/* Server Seed Hash - Only show when there's an active game or completed game */}
        {serverSeedHash && (
          <div>
            <h3 className="text-white font-bold mb-2">Server Seed Hash</h3>
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <code className="text-yellow-400 text-sm font-mono flex-1 break-all">
                  {serverSeedHash}
                </code>
                <button
                  onClick={() => copyToClipboard(serverSeedHash, 'hash')}
                  className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                >
                  {copied === 'hash' ? (
                    <Check className="w-4 h-4 text-lime-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-zinc-500 text-xs mt-2">
              {isGameActive 
                ? "The server seed will be revealed after the game ends."
                : "Hash of the server seed, committed before the game starts."}
            </p>
          </div>
        )}

        {/* Server Seed (only shown after game) */}
        {serverSeed && !isGameActive && (
          <div>
            <h3 className="text-white font-bold mb-2">Server Seed (Revealed)</h3>
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <code className="text-green-400 text-sm font-mono flex-1 break-all">
                  {serverSeed}
                </code>
                <button
                  onClick={() => copyToClipboard(serverSeed, 'server')}
                  className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                >
                  {copied === 'server' ? (
                    <Check className="w-4 h-4 text-lime-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How to Verify */}
        <div>
          <h3 className="text-white font-bold mb-2">How to Verify</h3>
          <ol className="text-zinc-400 text-sm space-y-2 list-decimal list-inside">
            <li>Note the server seed hash shown at game start</li>
            <li>After the game ends, the server seed will be revealed</li>
            <li>Hash the revealed server seed - it should match the hash</li>
            <li>The game result is derived from hashing client seed + server seed</li>
          </ol>
        </div>
      </div>
    </Modal>
  )
}
