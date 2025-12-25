'use client'

import { Modal } from '@/components/ui/Modal'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface ProvablyFairModalProps {
  isOpen: boolean
  onClose: () => void
  clientSeed?: string
  serverSeedHash?: string
  serverSeed?: string
  isGameActive?: boolean
}

export function ProvablyFairModal({ 
  isOpen, 
  onClose, 
  clientSeed,
  serverSeedHash,
  serverSeed,
  isGameActive 
}: ProvablyFairModalProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Provably Fair"
      subtitle="Verify game outcomes and view your seeds"
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
            </div>
            <div className="flex items-center gap-2">
              <code className="text-lime-400 text-sm font-mono flex-1 break-all">
                {clientSeed || 'No active game'}
              </code>
              {clientSeed && (
                <button
                  onClick={() => copyToClipboard(clientSeed, 'client')}
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
        </div>

        {/* Server Seed Hash */}
        <div>
          <h3 className="text-white font-bold mb-2">Server Seed Hash</h3>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <code className="text-yellow-400 text-sm font-mono flex-1 break-all">
                {serverSeedHash || 'No active game'}
              </code>
              {serverSeedHash && (
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
              )}
            </div>
          </div>
          <p className="text-zinc-500 text-xs mt-2">
            {isGameActive 
              ? "The server seed will be revealed after the game ends."
              : "Hash of the server seed, committed before the game starts."}
          </p>
        </div>

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
