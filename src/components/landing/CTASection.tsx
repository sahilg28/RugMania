'use client'

import { usePrivy } from '@privy-io/react-auth'
import { Wallet, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface CTASectionProps {
  onPlayDemo: () => void
}

export function CTASection({ onPlayDemo }: CTASectionProps) {
  const { login, ready } = usePrivy()

  return (
    <div className="rounded-xl border-2 border-lime-400 bg-zinc-900 p-6 text-center">
      <h2 className="text-white text-lg font-black mb-4 tracking-tight uppercase">
        How do you wanna start the game?
      </h2>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={login} disabled={!ready}>
          <Wallet className="w-4 h-4" />
          Sign In
        </Button>
        <Button variant="neutral" onClick={onPlayDemo}>
          <Play className="w-4 h-4" />
          Play Demo
        </Button>
      </div>
    </div>
  )
}
