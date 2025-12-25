'use client'

import { Modal } from '@/components/ui/Modal'
import { AccordionItem } from '@/components/ui/Accordion'

interface HowItWorksModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How It Works"
      subtitle="Learn how to play RugMania and understand the game mechanics"
    >
      <div>
        <AccordionItem title="Game Overview" defaultOpen>
          <p>
            The Run to 100x has begun! Choose Safe Doors, Dodge the Rugs. The more you run, the more you can earn!
          </p>
        </AccordionItem>

        <AccordionItem title="How to Play">
          <ol className="space-y-2 list-decimal list-inside">
            <li>Choose your bet amount and difficulty, and click Place Bet</li>
            <li>Pick one door from the visible set of doors</li>
            <li>Avoid the rugpull door. Each level hides one rugpull door that rugs you to zero</li>
            <li>Survive to multiply. Your payout multiplier increases with every level you survive</li>
            <li>Cash out anytime to lock in your winnings before you get rugged!</li>
          </ol>
        </AccordionItem>

        <AccordionItem title="Provably Fair">
          <p>
            Every game outcome is cryptographically verifiable using our provably fair system. You can verify that each game result was predetermined and not manipulated.
          </p>
        </AccordionItem>
      </div>
    </Modal>
  )
}
