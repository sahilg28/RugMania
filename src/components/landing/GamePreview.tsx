'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const LEVELS = [
  { level: 1, multiplier: 1.18 },
  { level: 2, multiplier: 1.39 },
  { level: 3, multiplier: 1.65 },
  { level: 4, multiplier: 1.95 },
  { level: 5, multiplier: 2.30 },
  { level: 6, multiplier: 2.72 },
  { level: 7, multiplier: 3.21 },
  { level: 8, multiplier: 3.79 },
  { level: 9, multiplier: 4.48 },
  { level: 10, multiplier: 5.29 },
]

function PreviewDoor() {
  return (
    <div className="w-[52px] h-[75px] sm:w-[70px] sm:h-[100px] md:w-[80px] md:h-[115px] rounded-t-[20px] sm:rounded-t-[30px] rounded-b-md bg-gradient-to-b from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),0_4px_12px_rgba(0,0,0,0.3)] border-2 border-[#5b21b6] hover:border-white/50 transition-colors cursor-pointer">
      <span className="text-white font-black text-[10px] sm:text-sm tracking-wide">WIN!</span>
      <span className="text-white/70 font-bold text-[8px] sm:text-xs">OR</span>
      <span className="text-white font-black text-[10px] sm:text-sm tracking-wide">RUG!</span>
    </div>
  )
}

export function GamePreview() {
  const [currentLevel, setCurrentLevel] = useState(0)
  const currentLevelData = LEVELS[currentLevel]

  return (
    <div 
      className="h-full flex flex-col transition-colors rounded-xl border-2 border-lime-400 relative overflow-hidden"
      style={{ 
        backgroundColor: '#0a0a12',
        backgroundImage: 'linear-gradient(rgba(163, 230, 53, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(163, 230, 53, 0.03) 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      }}
    >
      {/* Message Banner */}
      <div className="flex justify-center pt-2 sm:pt-4 pb-1 sm:pb-2 relative z-10">
        <div className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-full border-2 border-zinc-700 text-xs sm:text-sm text-zinc-300 bg-zinc-800/80 font-medium text-center max-w-[90%]">
          The more doors you pass, the more you win!
        </div>
      </div>

      {/* Game Content */}
      <div className="relative flex-1 px-2 sm:px-4 pb-2 sm:pb-3 flex flex-col items-center justify-center">
        {/* Level Controls */}
        <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 sm:gap-3 z-20">
          <button
            onClick={() => currentLevel < LEVELS.length - 1 && setCurrentLevel(prev => prev + 1)}
            className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border-2 transition-all",
              currentLevel < LEVELS.length - 1 
                ? "bg-lime-400 text-black border-black shadow-brutal-sm hover:bg-lime-300" 
                : "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed"
            )}
          >
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => currentLevel > 0 && setCurrentLevel(prev => prev - 1)}
            className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border-2 transition-all",
              currentLevel > 0 
                ? "bg-lime-400 text-black border-black shadow-brutal-sm hover:bg-lime-300" 
                : "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed"
            )}
          >
            <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Game Stage */}
        <div className="relative flex flex-col items-center justify-end flex-1 w-full">
          <div className="relative flex flex-col items-center w-full max-w-[550px] pb-8 sm:pb-12">
            {/* Level Badge */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentLevel}
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -50 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative z-20 -mb-2 sm:-mb-3 inline-flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-lime-400 text-black rounded-lg border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] sm:shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
              >
                <span className="text-lg sm:text-2xl font-black">Lvl {currentLevelData.level}:</span>
                <span className="text-lg sm:text-2xl font-black">{currentLevelData.multiplier.toFixed(2)}x</span>
              </motion.div>
            </AnimatePresence>

            {/* Door Container */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={`doors-${currentLevel}`}
                initial={{ scale: 0.85, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: -40 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative z-10 rounded-xl border-2 border-lime-400 bg-[rgba(91,33,182,0.25)] w-full max-w-fit"
              >
                <div className="px-3 sm:px-6 py-3 sm:py-5">
                  <div className="grid grid-cols-5 gap-2 sm:gap-4">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <PreviewDoor key={i} />
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floor Platform */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-12 sm:h-16 z-0"
        style={{
          background: 'linear-gradient(180deg, #5b21b6 0%, #2e1065 100%)',
          clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
        }}
      />
    </div>
  )
}
