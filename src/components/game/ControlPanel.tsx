"use client";

import { Wallet, Play } from "lucide-react";
import { GameState, Difficulty } from "@/types/game";
import { cn } from "@/lib/utils";
import { formatEther } from "viem";

interface ControlPanelProps {
  gameState: GameState;
  isDemo: boolean;
  balance: number;
  amount: string;
  setAmount: (val: string) => void;
  selectedDifficulty: Difficulty;
  setSelectedDifficulty: (val: Difficulty) => void;
  maxBet?: bigint;
  isPlacingBet: boolean;
  isCashingOut: boolean;
  isSelectingDoor?: boolean;
  onStartGame: () => void;
  onCashOut: () => void;
  onPlayAgain: () => void;
  onLogin: () => void;
  onOpenProvablyFair?: () => void;
  onResetDemoBalance?: () => void;
}

export function ControlPanel({
  gameState,
  isDemo,
  balance,
  amount,
  setAmount,
  selectedDifficulty,
  setSelectedDifficulty,
  maxBet,
  isPlacingBet,
  isCashingOut,
  isSelectingDoor = false,
  onStartGame,
  onCashOut,
  onPlayAgain,
  onLogin,
  onOpenProvablyFair,
  onResetDemoBalance,
}: ControlPanelProps) {
  const maxBetValue = maxBet ? parseFloat(formatEther(maxBet)) : 10;

  return (
    <div className={cn(
      "shrink-0 rounded-xl border-2 bg-zinc-900 p-3 sm:p-4 transition-colors",
      gameState.phase === "rugged" ? "border-red-500" :
      gameState.phase === "won" ? "border-green-500" : "border-lime-400"
    )}>
      {/* IDLE STATE */}
      {gameState.phase === "idle" && (
        isDemo ? (
          <div className="space-y-2 sm:space-y-3">
            {/* Demo Balance & Difficulty */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-lime-400" />
                <span className="text-zinc-400 text-[10px] sm:text-xs font-medium">Balance:</span>
                <span className="text-lime-400 font-bold text-xs sm:text-sm">{balance.toFixed(2)} MNT</span>
                {balance < 0.5 && onResetDemoBalance && (
                  <button 
                    onClick={onResetDemoBalance}
                    className="text-[10px] sm:text-xs text-lime-400 hover:text-lime-300 font-semibold transition-colors ml-1"
                  >
                    (Reset)
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <span className="text-zinc-400 text-[10px] sm:text-xs font-medium">Difficulty</span>
              </div>
            </div>
            
            {/* Amount & Difficulty Selection */}
            <div className="flex gap-2 sm:gap-3">
              <div className="flex-1 flex items-center rounded-lg border-2 border-zinc-700 overflow-hidden bg-zinc-800">
                <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 px-2 sm:px-4 py-2 sm:py-2.5 text-white font-medium text-xs sm:text-sm outline-none placeholder:text-zinc-500 bg-transparent min-w-0" placeholder="Amount" />
                <button onClick={() => setAmount("0.5")} className="px-1.5 sm:px-2 py-1 sm:py-1.5 mx-0.5 text-zinc-300 text-[10px] sm:text-xs font-bold rounded border-2 border-zinc-600 hover:border-lime-400 hover:text-lime-400 transition-colors bg-zinc-800">0.5</button>
                <button onClick={() => setAmount("1")} className="px-1.5 sm:px-2 py-1 sm:py-1.5 mx-0.5 text-zinc-300 text-[10px] sm:text-xs font-bold rounded border-2 border-zinc-600 hover:border-lime-400 hover:text-lime-400 transition-colors bg-zinc-800">1</button>
                <button onClick={() => setAmount(Math.min(5, balance).toString())} className="px-1.5 sm:px-2 py-1 sm:py-1.5 mr-1 text-zinc-300 text-[10px] sm:text-xs font-bold rounded border-2 border-zinc-600 hover:border-lime-400 hover:text-lime-400 transition-colors bg-zinc-800">MAX</button>
              </div>
              <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(Number(e.target.value) as Difficulty)}
                className="w-[100px] sm:w-[130px] px-2 sm:px-3 py-2 sm:py-2.5 bg-lime-400 text-black text-xs sm:text-sm font-bold rounded-lg border-2 border-black cursor-pointer shadow-brutal-sm hover:bg-lime-300 transition-all"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: "28px", appearance: "none" }}>
                <option value={5}>Easy</option>
                <option value={4}>Medium</option>
                <option value={3}>Hard</option>
              </select>
            </div>
            
            {/* Play Button */}
            <button 
              onClick={onStartGame} 
              disabled={!amount || parseFloat(amount) < 0.1 || parseFloat(amount) > balance}
              className="w-full py-3 sm:py-4 text-sm sm:text-base bg-lime-400 text-black font-bold rounded-xl border-2 border-black shadow-brutal-sm hover:bg-lime-300 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!amount || parseFloat(amount) < 0.1 ? "Enter Amount" : parseFloat(amount) > balance ? "Insufficient Balance" : "PLAY NOW"}
            </button>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
                <span className="text-zinc-400 text-[10px] sm:text-xs font-medium">Balance:</span>
                <span className="text-white font-bold text-xs sm:text-sm">{balance.toFixed(2)} MNT</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <span className="text-zinc-400 text-[10px] sm:text-xs font-medium">Difficulty</span>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <div className="flex-1 flex items-center rounded-lg border-2 border-zinc-700 overflow-hidden bg-zinc-800">
                <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1 px-2 sm:px-4 py-2 sm:py-2.5 text-white font-medium text-xs sm:text-sm outline-none placeholder:text-zinc-500 bg-transparent min-w-0" placeholder="Amount" />
                <button onClick={() => setAmount("1")} className="px-2 sm:px-3 py-1 sm:py-1.5 mx-0.5 text-zinc-300 text-[10px] sm:text-xs font-bold rounded border-2 border-zinc-600 hover:border-lime-400 hover:text-lime-400 transition-colors bg-zinc-800">1</button>
                <button onClick={() => setAmount("10")} className="px-2 sm:px-3 py-1 sm:py-1.5 mr-1 text-zinc-300 text-[10px] sm:text-xs font-bold rounded border-2 border-zinc-600 hover:border-lime-400 hover:text-lime-400 transition-colors bg-zinc-800">10</button>
              </div>
              <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(Number(e.target.value) as Difficulty)}
                className="w-[100px] sm:w-[130px] px-2 sm:px-3 py-2 sm:py-2.5 bg-lime-400 text-black text-xs sm:text-sm font-bold rounded-lg border-2 border-black cursor-pointer shadow-brutal-sm hover:bg-lime-300 transition-all"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", paddingRight: "28px", appearance: "none" }}>
                <option value={5}>Easy</option>
                <option value={4}>Medium</option>
                <option value={3}>Hard</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={onStartGame} disabled={isPlacingBet || !amount || parseFloat(amount) < 0.1 || parseFloat(amount) > maxBetValue || parseFloat(amount) > balance}
                className="flex-1 py-2.5 sm:py-3 text-zinc-400 font-bold text-xs sm:text-sm rounded-lg border-2 border-zinc-700 bg-zinc-800 hover:bg-lime-400 hover:text-black hover:border-black transition-all disabled:opacity-50">
                {isPlacingBet ? "Placing Bet..." : !amount || parseFloat(amount) < 0.1 ? "Min Bet: 0.1 MNT" : parseFloat(amount) > maxBetValue ? `Max Bet: ${maxBetValue.toFixed(2)} MNT` : parseFloat(amount) > balance ? "Insufficient Balance" : "Place Bet"}
              </button>
              {!isDemo && onOpenProvablyFair && (
                <button 
                  onClick={onOpenProvablyFair}
                  disabled={isPlacingBet}
                  className={cn(
                    "w-10 sm:w-12 py-2.5 sm:py-3 rounded-lg border-2 flex items-center justify-center transition-all",
                    "bg-lime-400 text-black border-black shadow-brutal-sm hover:bg-lime-300",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  title="Provably Fair (view/change seeds)"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                </button>
              )}
            </div>
          </div>
        )
      )}

      {/* PLAYING STATE */}
      {gameState.phase === "playing" && (
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between px-1 sm:px-2">
            <div className="text-zinc-400 text-xs sm:text-sm">
              <span className="font-medium">Multiplier: </span>
              <span className="text-white font-bold">{(isDemo ? gameState.multiplier : gameState.multiplier / 1e18).toFixed(2)}x</span>
            </div>
            <div className="text-zinc-400 text-xs sm:text-sm">
              <span className="font-medium">Win: </span>
              <span className="text-lime-400 font-bold">
                {isDemo 
                  ? gameState.potentialWin.toFixed(4) 
                  : (gameState.betAmount * (gameState.multiplier / 1e18) * 0.95).toFixed(4)
                } MNT
              </span>
            </div>
          </div>
          <button onClick={onCashOut} disabled={gameState.currentLevel < 1 || isCashingOut || isSelectingDoor}
            className="w-full py-3 sm:py-4 text-sm sm:text-base bg-zinc-800 text-white font-bold rounded-xl border-2 border-zinc-700 hover:bg-lime-400 hover:text-black hover:border-black transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {isCashingOut ? "Cashing out..." : isSelectingDoor ? (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mx-auto" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
            ) : "Cash Out"}
          </button>
        </div>
      )}

      {/* RUGGED STATE */}
      {gameState.phase === "rugged" && (
        <div className="text-center space-y-3 sm:space-y-4 py-1 sm:py-2">
          <h3 className="text-white font-black text-lg sm:text-xl tracking-wide">YOU GOT RUGGED!</h3>
          {isDemo ? (
            <div className="flex gap-2 sm:gap-3 justify-center">
              <button onClick={onLogin} className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-lime-400 text-black font-bold rounded-lg border-2 border-lime-400 hover:bg-lime-300 transition-all flex items-center gap-1.5 sm:gap-2"><Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />Sign In</button>
              <button onClick={onPlayAgain} className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-zinc-800 text-white font-bold rounded-lg border-2 border-zinc-700 hover:border-zinc-500 transition-all flex items-center gap-1.5 sm:gap-2"><Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />Play Demo</button>
            </div>
          ) : (
            <div className="flex gap-2 sm:gap-3">
              <button onClick={onPlayAgain} className="flex-1 py-2.5 sm:py-3 text-sm sm:text-base bg-lime-400 text-black font-bold rounded-lg border-2 border-black shadow-brutal-sm hover:bg-lime-300 transition-all">Play Again</button>
              <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just got RUGGED in RugMania 💀 Think you can survive longer? ${window.location.href}`)}`, "_blank")}
                className="flex-1 py-2.5 sm:py-3 text-sm sm:text-base bg-black text-white font-bold rounded-lg border-2 border-zinc-700 hover:border-white transition-all">Share on X</button>
            </div>
          )}
        </div>
      )}

      {/* WON STATE */}
      {gameState.phase === "won" && (
        <div className="text-center space-y-3 sm:space-y-4 py-1 sm:py-2">
          <h3 className="text-white font-black text-lg sm:text-xl tracking-wide">
            {isDemo 
              ? `🎉 You Won ${gameState.actualPayout?.toFixed(4) || gameState.potentialWin.toFixed(4)} MNT!` 
              : `You Won ${gameState.actualPayout?.toFixed(4) || (gameState.potentialWin / 1e18).toFixed(4)} MNT!`
            }
          </h3>
          {isDemo ? (
            <div className="flex gap-2 sm:gap-3 justify-center">
              <button onClick={onLogin} className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-lime-400 text-black font-bold rounded-lg border-2 border-lime-400 hover:bg-lime-300 transition-all flex items-center gap-1.5 sm:gap-2"><Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />Play for Real</button>
              <button onClick={onPlayAgain} className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-zinc-800 text-white font-bold rounded-lg border-2 border-zinc-700 hover:border-zinc-500 transition-all flex items-center gap-1.5 sm:gap-2"><Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />Play Again</button>
            </div>
          ) : (
            <div className="flex gap-2 sm:gap-3">
              <button onClick={onPlayAgain} className="flex-1 py-2.5 sm:py-3 text-sm sm:text-base bg-lime-400 text-black font-bold rounded-lg border-2 border-black shadow-brutal-sm hover:bg-lime-300 transition-all">Play Again</button>
              <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just hit ${(isDemo ? gameState.multiplier : gameState.multiplier / 1e18).toFixed(2)}x in RugMania 🔥 ${window.location.href}`)}`, "_blank")}
                className="flex-1 py-2.5 sm:py-3 text-sm sm:text-base bg-black text-white font-bold rounded-lg border-2 border-zinc-700 hover:border-white transition-all">Share on X</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
