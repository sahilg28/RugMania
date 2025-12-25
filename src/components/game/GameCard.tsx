"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";
import { RugDoor } from "./RugDoor";
import { GameState, Difficulty } from "@/types/game";
import { cn } from "@/lib/utils";
import { MULTIPLIERS } from "./constants";

interface GameCardProps {
  gameState: GameState;
  isDemo: boolean;
  currentLevel: number;
  selectedDifficulty: Difficulty;
  gameMessage: string;
  onDoorClick: (index: number) => void;
  onLevelChange: (direction: "up" | "down") => void;
}

export function GameCard({
  gameState,
  isDemo,
  currentLevel,
  selectedDifficulty,
  gameMessage,
  onDoorClick,
  onLevelChange,
}: GameCardProps) {
  return (
    <div
      className={cn(
        "flex-1 h-full flex flex-col transition-colors rounded-xl border-2 relative overflow-hidden",
        gameState.phase === "rugged" ? "border-red-500" :
        gameState.phase === "won" ? "border-green-500" : "border-lime-400"
      )}
      style={{
        backgroundColor: "#0a0a12",
        backgroundImage: "linear-gradient(rgba(163, 230, 53, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(163, 230, 53, 0.03) 1px, transparent 1px)",
        backgroundSize: "30px 30px",
      }}
    >
      {/* Message Banner */}
      <div className="flex justify-center pt-2 sm:pt-4 pb-1 sm:pb-2 relative z-10">
        {gameState.phase === "rugged" ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 border-red-500 text-xs sm:text-sm text-red-400 bg-red-500/10 flex items-center gap-1 sm:gap-2 font-medium">
            <span>⚠️</span><span className="hidden sm:inline">Rug pulled! That wasn&apos;t the lucky door</span><span className="sm:hidden">Rugged!</span>
          </motion.div>
        ) : gameState.phase === "won" ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border-2 border-green-500 text-xs sm:text-sm text-green-400 bg-green-500/10 flex items-center gap-1 sm:gap-2 font-medium">
            <span>😊</span><span className="hidden sm:inline">Cashed out successfully!</span><span className="sm:hidden">You won!</span>
          </motion.div>
        ) : (
          <motion.div key={gameMessage} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-full border-2 border-zinc-700 text-xs sm:text-sm text-zinc-300 bg-zinc-800/80 font-medium text-center max-w-[90%]">
            {gameMessage}
          </motion.div>
        )}
      </div>

      {/* Game Content */}
      <div className="relative flex-1 px-2 sm:px-4 pb-2 sm:pb-3 flex flex-col items-center justify-center">
        {/* Level Controls - Positioned differently on mobile */}
        <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 sm:gap-3 z-20">
          <button onClick={() => onLevelChange("up")} disabled={currentLevel >= 10 || gameState.phase !== "idle"}
            className={cn("w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border-2 transition-all",
              currentLevel < 10 && gameState.phase === "idle" ? "bg-lime-400 text-black border-black shadow-brutal-sm hover:bg-lime-300" : "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed")}>
            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={() => onLevelChange("down")} disabled={currentLevel <= 1 || gameState.phase !== "idle"}
            className={cn("w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg border-2 transition-all",
              currentLevel > 1 && gameState.phase === "idle" ? "bg-lime-400 text-black border-black shadow-brutal-sm hover:bg-lime-300" : "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed")}>
            <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Game Stage */}
        <div className="relative flex flex-col items-center justify-end flex-1 w-full">
          <div className="relative flex flex-col items-center w-full max-w-[550px] pb-8 sm:pb-12">
            {/* Level Badge */}
            <AnimatePresence mode="wait">
              <motion.div
                key={gameState.phase === "playing" ? `playing-${gameState.currentLevel}` : `idle-${currentLevel}`}
                initial={{ scale: 0.8, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: -50 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative z-20 -mb-2 sm:-mb-3 inline-flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-lime-400 text-black rounded-lg border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] sm:shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                <span className="text-lg sm:text-2xl font-black">
                  Lvl {gameState.phase === "playing" || gameState.phase === "won" ? gameState.currentLevel + 1 : currentLevel}:
                </span>
                <span className="text-lg sm:text-2xl font-black">
                  {gameState.phase === "playing" || gameState.phase === "won"
                    ? (isDemo ? gameState.multiplier : gameState.multiplier / 1e18).toFixed(2)
                    : MULTIPLIERS[selectedDifficulty][(currentLevel || 1) - 1]?.toFixed(2) || "1.00"}x
                </span>
              </motion.div>
            </AnimatePresence>

            {/* Door Container */}
            <AnimatePresence mode="wait">
              <motion.div
                key={gameState.phase === "playing" ? `doors-${gameState.currentLevel}` : `doors-idle-${currentLevel}`}
                initial={{ scale: 0.85, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0, y: -40 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={cn("relative z-10 rounded-xl border-2 transition-colors w-full max-w-fit",
                  gameState.phase === "rugged" ? "border-red-500 bg-red-950/30" :
                  gameState.phase === "won" ? "border-green-500 bg-green-950/30" : "border-lime-400 bg-[rgba(91,33,182,0.25)]")}>
                <div className="px-3 sm:px-6 py-3 sm:py-5">
                  {/* Playing State */}
                  {gameState.phase === "playing" && (
                    <div className={cn("grid gap-2 sm:gap-4", gameState.difficulty === 5 && "grid-cols-5", gameState.difficulty === 4 && "grid-cols-4", gameState.difficulty === 3 && "grid-cols-3")}>
                      {gameState.doors.map((door, index) => (
                        <RugDoor key={index} door={door} onClick={() => onDoorClick(index)} disabled={gameState.phase !== "playing"} />
                      ))}
                    </div>
                  )}

                  {/* Idle State */}
                  {gameState.phase === "idle" && (
                    <div className={cn("grid gap-2 sm:gap-4", selectedDifficulty === 5 && "grid-cols-5", selectedDifficulty === 4 && "grid-cols-4", selectedDifficulty === 3 && "grid-cols-3")}>
                      {Array.from({ length: selectedDifficulty }, (_, i) => (
                        <div key={i} className="w-[52px] h-[75px] sm:w-[70px] sm:h-[100px] md:w-[80px] md:h-[115px] rounded-t-[20px] sm:rounded-t-[30px] rounded-b-md bg-gradient-to-b from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),0_4px_12px_rgba(0,0,0,0.3)] border-2 border-[#5b21b6] hover:border-white/50 transition-colors cursor-pointer">
                          <span className="text-white font-black text-[10px] sm:text-sm tracking-wide">WIN!</span>
                          <span className="text-white/70 font-bold text-[8px] sm:text-xs">OR</span>
                          <span className="text-white font-black text-[10px] sm:text-sm tracking-wide">RUG!</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Rugged/Won State */}
                  {(gameState.phase === "rugged" || gameState.phase === "won") && (
                    <div className={cn("grid gap-2 sm:gap-4", gameState.difficulty === 5 && "grid-cols-5", gameState.difficulty === 4 && "grid-cols-4", gameState.difficulty === 3 && "grid-cols-3")}>
                      {gameState.doors.map((door, index) => (
                        <RugDoor key={index} door={door} onClick={() => {}} disabled={true} />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floor Platform */}
      <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-16 z-0 transition-colors"
        style={{
          background: gameState.phase === "rugged" ? "linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)" :
            gameState.phase === "won" ? "linear-gradient(180deg, #166534 0%, #14532d 100%)" : "linear-gradient(180deg, #5b21b6 0%, #2e1065 100%)",
          clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
        }}
      />
    </div>
  );
}
