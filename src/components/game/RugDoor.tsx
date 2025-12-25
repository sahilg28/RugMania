'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DoorState } from '@/types/game'

interface RugDoorProps {
  door: DoorState
  onClick: () => void
  disabled?: boolean
}

export function RugDoor({ door, onClick, disabled = false }: RugDoorProps) {
  const getDoorContent = () => {
    if (door.isRevealed) {
      if (door.isRug) {
        // Rugged door - only skull
        return (
          <div className="flex items-center justify-center h-full">
            <span className="text-2xl sm:text-3xl md:text-4xl">💀</span>
          </div>
        )
      }
      // Safe door - just green, no content
      return null
    }
    
    // Unrevealed door - WIN! OR RUG! on three lines
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-white font-black text-[10px] sm:text-sm tracking-wide">WIN!</span>
        <span className="text-white/70 font-bold text-[8px] sm:text-xs">OR</span>
        <span className="text-white font-black text-[10px] sm:text-sm tracking-wide">RUG!</span>
      </div>
    )
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || door.isRevealed}
      className={cn(
        "relative w-[52px] h-[75px] sm:w-[70px] sm:h-[100px] md:w-[80px] md:h-[115px]",
        "rounded-t-[20px] sm:rounded-t-[30px] rounded-b-md",
        "border-2 transition-all duration-300",
        door.isRevealed
          ? door.isRug
            ? "bg-gradient-to-b from-red-500 to-red-700 border-red-800"
            : "bg-gradient-to-b from-green-500 to-green-600 border-green-700"
          : "bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] border-[#5b21b6]",
        "shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_4px_8px_rgba(0,0,0,0.4)]",
        !door.isRevealed && !disabled && "cursor-pointer hover:border-white/50",
        door.isRevealed && "cursor-default",
        disabled && !door.isRevealed && "cursor-not-allowed"
      )}
      whileTap={!door.isRevealed && !disabled ? { scale: 0.95 } : {}}
      animate={{
        rotateY: door.isRevealed ? [0, 180, 360] : 0,
      }}
      transition={{
        duration: 0.5,
        ease: "easeInOut"
      }}
    >
      {getDoorContent()}
      
    </motion.button>
  )
}
