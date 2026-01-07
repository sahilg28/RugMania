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
      subtitle="Learn the flow, avoid the rug, lock in your wins"
    >
      <div>
        <AccordionItem title="Game Overview" defaultOpen>
          <p>
            Race to 100x by picking safe doors and dodging rugs. Each level you survive boosts your multiplier—cash out before you get rugged.
          </p>
        </AccordionItem>

        <AccordionItem title="How to Play">
          <ol className="space-y-2 list-decimal list-inside">
            <li>Pick your bet and difficulty, then hit Place Bet.</li>
            <li>Choose one door each round; one door is always the rug.</li>
            <li>If you hit the rug door, the run ends and you lose the round.</li>
            <li>Every safe pick increases your multiplier for that run.</li>
            <li>Cash out anytime to secure your current winnings.</li>
          </ol>
        </AccordionItem>

        <AccordionItem title="Provably Fair">
          <p>
            Every round is pre-committed and verifiable. Check the revealed seeds after each run to confirm the outcome was fixed before you played.
          </p>
        </AccordionItem>
      </div>
    </Modal>
  )
}
