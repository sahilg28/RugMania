"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { GameState, DoorState, Difficulty } from "@/types/game";
import { generateRandomSeed } from "@/lib/utils";
import confetti from "canvas-confetti";
import { usePrivy } from "@privy-io/react-auth";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { formatEther, parseEther, keccak256 } from "viem";
import { CONTRACT_ADDRESSES } from "@/config/chains";
import { useRugMania } from "@/hooks/useMyContract";
import { useContractEventPolling, publicClient } from "@/hooks/useContractEventPolling";
import { toast } from "react-toastify";

// Components
import { GameCard } from "./GameCard";
import { ControlPanel } from "./ControlPanel";
import { Leaderboard } from "./Leaderboard";
import { MULTIPLIERS, GAME_MESSAGES } from "./constants";
import { HowItWorksModal } from "@/components/modals/HowItWorksModal";
import { ProvablyFairModal } from "@/components/modals/ProvablyFairModal";

const DEBUG_LOGS = process.env.NEXT_PUBLIC_DEBUG_LOGS === "1";

function logDebug(message: string, meta?: Record<string, unknown>) {
  if (!DEBUG_LOGS) return;
  if (meta) {
    console.log(message, meta);
    return;
  }
  console.log(message);
}

function shortHash(hash: string) {
  if (!hash) return "";
  if (hash.length <= 18) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

interface GameBoardProps {
  isDemo?: boolean;
  onExitDemo?: () => void;
}

export function GameBoard({ isDemo = false, onExitDemo }: GameBoardProps) {
  const { logout, login } = usePrivy();
  const { 
    placeBet, selectDoor, cashOut, maxBet, maxLevels, 
    hasActiveGame, game: contractGame, refetchContractState, contractAddress
  } = useRugMania();
  
  const [realBalance, setRealBalance] = useState<bigint>(BigInt(0));
  const [demoBalance, setDemoBalance] = useState(10); // Demo starts with 10 MNT
  const [gameState, setGameState] = useState<GameState>({
    phase: "idle", betAmount: 0, difficulty: 5, currentLevel: 0, multiplier: 1, doors: [], potentialWin: 0,
  });
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [isSelectingDoor, setIsSelectingDoor] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(5);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showProvablyFair, setShowProvablyFair] = useState(false);

  const initializeDoors = useCallback((count: number): DoorState[] => {
    return Array.from({ length: count }, (_, i) => ({ index: i, isRevealed: false, isRug: false, isSelected: false }));
  }, []);

  // Track if we've already shown the restore toast to prevent spam
  const [hasShownRestoreToast, setHasShownRestoreToast] = useState(false);

  // Sync game state from contract on mount
  useEffect(() => {
    if (isDemo || !contractGame) return;

    (async () => {
    
    if (contractGame.isActive && gameState.phase === "idle") {
      let serverSeed = localStorage.getItem("serverSeed");
      let clientSeed = localStorage.getItem("clientSeed");
      const storedHash = localStorage.getItem("serverSeedHash");
      
      // If we have serverSeed in localStorage, verify it matches contract's hash
      if (serverSeed) {
        // Ensure proper format
        if (!serverSeed.startsWith('0x')) {
          serverSeed = `0x${serverSeed}`;
        }
        
        // Verify the hash matches what's stored on contract
        const computedHash = keccak256(serverSeed as `0x${string}`);
        const contractHash = contractGame.serverSeedHash as string;

        logDebug("Restoring game", {
          hashMatchesContract: computedHash.toLowerCase() === contractHash.toLowerCase(),
        });
        
        if (computedHash.toLowerCase() !== contractHash.toLowerCase()) {
          console.error("HASH MISMATCH during restore! Seeds don't match contract.");
          // Clear invalid seeds
          localStorage.removeItem("serverSeed");
          localStorage.removeItem("clientSeed");
          localStorage.removeItem("serverSeedHash");
          serverSeed = null;
        }
      }

      // If no serverSeed in localStorage, try MongoDB
    if (!serverSeed && contractAddress) {
      try {
        const response = await fetch(`/api/users/game-state?address=${contractAddress}`);
        if (response.ok) {
          const dbData = await response.json();
          console.log("db data", dbData);
          if (dbData.serverSeed) {
            console.log("=== RESTORING FROM MONGODB ===");
            console.log("Server seed from DB:", dbData.serverSeed);
            
            // Restore seeds from MongoDB
            serverSeed = dbData.serverSeed;
            clientSeed = dbData.clientSeed;
            
            // Verify hash matches contract
            const computedHash = keccak256(serverSeed as `0x${string}`);
            const contractHash = contractGame.serverSeedHash as string;
            
            if (computedHash.toLowerCase() === contractHash.toLowerCase()) {
              // Hash matches - restore game state
              setGameState({
                phase: "playing",
                betAmount: parseFloat(formatEther(contractGame.betAmount)),
                difficulty: contractGame.doorsPerLevel as Difficulty,
                currentLevel: contractGame.currentLevel,
                multiplier: MULTIPLIERS[contractGame.doorsPerLevel][contractGame.currentLevel] * 1e18,
                doors: initializeDoors(contractGame.doorsPerLevel),
                serverSeed: dbData.serverSeed || "",
                clientSeed: dbData.clientSeed || "",
                serverSeedHash: dbData.serverSeedHash,
                potentialWin: parseFloat(formatEther(contractGame.betAmount)) * MULTIPLIERS[contractGame.doorsPerLevel][contractGame.currentLevel],
              });
              setCurrentLevel(contractGame.currentLevel + 1);
              
              // Also save to localStorage for future use
              if (serverSeed) {
  localStorage.setItem("serverSeed", serverSeed);
}
              localStorage.setItem("clientSeed", clientSeed || "");
              localStorage.setItem("serverSeedHash", dbData.serverSeedHash);
              return;
            } else {
              console.error("HASH MISMATCH from MongoDB! Seeds don't match contract.");
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch game state from DB:", error);
      }
    }
      
      if (serverSeed) {
        setGameState({
          phase: "playing",
          betAmount: parseFloat(formatEther(contractGame.betAmount)),
          difficulty: contractGame.doorsPerLevel as Difficulty,
          currentLevel: contractGame.currentLevel,
          multiplier: Number(contractGame.multiplier),
          doors: initializeDoors(contractGame.doorsPerLevel),
          serverSeed: serverSeed,
          clientSeed: clientSeed || undefined,
          serverSeedHash: contractGame.serverSeedHash,
          potentialWin: parseFloat(formatEther(contractGame.betAmount)) * (Number(contractGame.multiplier) / 1e18),
        });
        setCurrentLevel(contractGame.currentLevel + 1);
        return;
      }
      
      // No serverSeed - show warning and let user cash out if possible
      // Don't try to recover old random seeds - it won't work
      if (!hasShownRestoreToast) {
        const canCashOut = contractGame.currentLevel >= 1;
        if (canCashOut) {
          toast.warning("Session expired but you can cash out your winnings!", { autoClose: false });
        } else {
          toast.error("Session expired. Game at level 0 cannot be recovered.", { autoClose: false });
        }
        setHasShownRestoreToast(true);
      }
      
      setGameState({
        phase: "playing",
        betAmount: parseFloat(formatEther(contractGame.betAmount)),
        difficulty: contractGame.doorsPerLevel as Difficulty,
        currentLevel: contractGame.currentLevel,
        multiplier: Number(contractGame.multiplier),
        doors: initializeDoors(contractGame.doorsPerLevel),
        serverSeed: undefined,
        clientSeed: undefined,
        serverSeedHash: contractGame.serverSeedHash,
        potentialWin: parseFloat(formatEther(contractGame.betAmount)) * (Number(contractGame.multiplier) / 1e18),
      });
      setCurrentLevel(contractGame.currentLevel + 1);
    }
    
    // If contract has no active game but UI thinks we're playing, reset to idle
    if (!contractGame.isActive && gameState.phase === "playing") {
      localStorage.removeItem("gameState");
      localStorage.removeItem("serverSeed");
      localStorage.removeItem("clientSeed");
      setHasShownRestoreToast(false);
      
      const selectedDoor = gameState.doors.find(door => door.isSelected);
      if (selectedDoor) {
        setGameState((prev) => ({
          ...prev, phase: "rugged",
          doors: prev.doors.map((door) => ({ ...door, isRevealed: true, isRug: door.isSelected })),
        }));
        toast.error("You got rugged! Better luck next time!");
      } else {
        setGameState({ phase: "idle", betAmount: 0, difficulty: 5, currentLevel: 0, multiplier: 1, doors: [], potentialWin: 0 });
        setCurrentLevel(1);
      }
    }
  })();
  }, [contractGame, isDemo, gameState.phase, gameState.doors, initializeDoors, hasShownRestoreToast]);

  // localStorage persistence - only used to persist serverSeed/clientSeed during active game
  useEffect(() => {
    if (isDemo) return;
    if (!hasActiveGame) {
      // Clear stale localStorage if no active game
      localStorage.removeItem("gameState");
    }
  }, [isDemo, hasActiveGame]);

  useEffect(() => {
    if (isDemo) return;
    if ((gameState.phase === "playing" || gameState.phase === "won") && gameState.serverSeed) {
      try { localStorage.setItem("gameState", JSON.stringify(gameState)); } catch (e) {}
    }
  }, [gameState, isDemo]);

  // Event polling
  useContractEventPolling({
    address: CONTRACT_ADDRESSES.doorRunner,
    eventName: 'BetPlaced',
    args: { player: contractAddress },
    enabled: !!contractAddress && !isDemo,
    onLogs: (logs) => {
      logs.forEach((log) => {
        const args = log.args as any;
        if (args) {
          setGameState((prev) => ({ ...prev, betAmount: parseFloat(formatEther(args.amount)), difficulty: args.diffculty as Difficulty }));
        }
      });
    },
    onError: (e) => console.error("BetPlaced polling error", e)
  });

  useContractEventPolling({
    address: CONTRACT_ADDRESSES.doorRunner,
    eventName: 'DoorSelected',
    args: { player: contractAddress },
    enabled: !!contractAddress && !isDemo,
    onLogs: (logs) => {
      logs.forEach((log) => {
        const args = log.args as any;
        if (args?.survived) {
          const newLevel = Number(args.level);
          setGameState((prev) => {
            const selectedIdx = prev.doors.findIndex(d => d.isSelected);
            return {
              // ...prev, currentLevel: newLevel, multiplier: Number(args.newMultiplier),
              // potentialWin: prev.betAmount * (Number(args.newMultiplier) / 1e18) * 1e18,
              ...prev, currentLevel: newLevel, multiplier: MULTIPLIERS[gameState.difficulty][newLevel] * 1e18,
              potentialWin: prev.betAmount * MULTIPLIERS[gameState.difficulty][newLevel],
              doors: prev.doors.map((d, i) => ({ ...d, isRevealed: i === selectedIdx, isRug: false, isSelected: i === selectedIdx })),
            };
          });
          setCurrentLevel(newLevel);
          if (maxLevels && newLevel >= Number(maxLevels)) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            setGameState((prev) => ({ ...prev, phase: "won" }));
            return;
          }
          setTimeout(() => setGameState((prev) => ({ ...prev, doors: initializeDoors(prev.difficulty) })), 2500);
        } else {
          setGameState((prev) => {
            const selectedIdx = prev.doors.findIndex(d => d.isSelected);
            return { ...prev, doors: prev.doors.map((d, i) => ({ ...d, isRevealed: true, isRug: i === selectedIdx, isSelected: i === selectedIdx })) };
          });
          // toast.error("You got rugged!");
          setTimeout(() => setGameState((prev) => ({ ...prev, phase: "rugged", doors: prev.doors.map(d => ({ ...d, isRevealed: true })) })), 1500);
        }
      });
    },
    onError: (e) => console.error("DoorSelected polling error", e)
  });

  // Helper to record game results to MongoDB
  const recordGameResult = useCallback(async (won: boolean, betAmount: number, payout: number, txHash?: string) => {
    if (isDemo || !contractAddress) return;
    try {
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: contractAddress, won, betAmount, payout, txHash }),
      });

      // Delete game session after recording result
    await fetch(`/api/users/game-state?address=${contractAddress}`, { method: 'DELETE' });
    console.log("Game session deleted after recording result");

    } catch (e) {
      console.error('Failed to record game:', e);
    }
  }, [isDemo, contractAddress]);

  useContractEventPolling({
    address: CONTRACT_ADDRESSES.doorRunner,
    eventName: 'Rugged',
    args: { player: contractAddress },
    enabled: !!contractAddress && !isDemo,
    onLogs: async (logs) => {
      logs.forEach(async (log) => {
        setGameState((prev) => {
          const selectedIdx = prev.doors.findIndex(d => d.isSelected);
          // Record loss to MongoDB
          recordGameResult(false, prev.betAmount, 0, log.transactionHash);
          
          return { ...prev, doors: prev.doors.map((d, i) => ({ ...d, isRevealed: true, isRug: i === selectedIdx })) };
        });
        toast.error("You got rugged!");
        setTimeout(() => setGameState((prev) => ({ ...prev, phase: "rugged", doors: prev.doors.map(d => ({ ...d, isRevealed: true })) })), 1500);
      });
    },
    onError: (e) => console.error("Rugged polling error", e)
  });

  useContractEventPolling({
    address: CONTRACT_ADDRESSES.doorRunner,
    eventName: 'CashOut',
    args: { player: contractAddress },
    enabled: !!contractAddress && !isDemo,
    onLogs: (logs) => {
      logs.forEach((log) => {
        const args = log.args as any;
        if (args) {
          const payout = parseFloat(formatEther(args.payout));
          setGameState((prev) => {
            // Record win to MongoDB
            recordGameResult(true, prev.betAmount, payout, log.transactionHash);

            // Show last completed level instead of current level
  const completedLevel = prev.currentLevel - 1;
  const completedMultiplier = MULTIPLIERS[prev.difficulty][completedLevel] * 1e18;
  
            return { ...prev, phase: "won", actualPayout: payout, currentLevel: completedLevel,  multiplier: completedMultiplier  };
          });
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          toast.success(`You won ${formatEther(args.payout)} MNT!`);
        }
      });
    },
    onError: (e) => console.error("CashOut polling error", e)
  });

  useContractEventPolling({
    address: CONTRACT_ADDRESSES.doorRunner,
    eventName: 'MaxLevelAchieved',
    args: { player: contractAddress },
    enabled: !!contractAddress && !isDemo,
    onLogs: () => {
      confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
    },
    onError: (e) => console.error("MaxLevelAchieved polling error", e)
  });

  // Fetch balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!contractAddress || isDemo) return;
      try {
        const bal = await publicClient.getBalance({ address: contractAddress as `0x${string}` });
        setRealBalance(bal);
      } catch (e) { console.error("Failed to fetch balance:", e); }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [contractAddress, isDemo]);

  // Refresh contract state during gameplay
  useEffect(() => {
    if (isDemo || !contractAddress || gameState.phase !== "playing") return;
    const interval = setInterval(() => refetchContractState(), 5000);
    return () => clearInterval(interval);
  }, [isDemo, contractAddress, gameState.phase, refetchContractState]);

  const balance = isDemo ? demoBalance : parseFloat(formatEther(realBalance));

  const gameMessage = useMemo(() => {
    const msgs = gameState.phase === "playing" ? GAME_MESSAGES.playing : GAME_MESSAGES.idle;
    return msgs[Math.floor(Math.random() * msgs.length)];
  }, [gameState.phase, gameState.currentLevel]);

  // Handlers
  const handleStartGame = useCallback(async () => {
    const betAmount = isDemo ? 1 : parseFloat(amount);
    if (!isDemo && (isNaN(betAmount) || betAmount < 0.1 || betAmount > 10 || betAmount > balance)) return;
    if (!isDemo && !contractAddress) return;

    if (isDemo) {
      const demoBetAmount = parseFloat(amount) || 1;
      
      // Validate demo bet
      if (demoBetAmount < 0.1) {
        toast.warning("Minimum bet is 0.1 MNT");
        return;
      }
      if (demoBetAmount > demoBalance) {
        toast.warning("Insufficient demo balance!");
        return;
      }
      
      // Deduct bet from demo balance
      setDemoBalance(prev => prev - demoBetAmount);
      
      setGameState({
        phase: "playing", betAmount: demoBetAmount, difficulty: selectedDifficulty, currentLevel: 0,
        multiplier: MULTIPLIERS[selectedDifficulty][0], doors: initializeDoors(selectedDifficulty),
        serverSeed: generateRandomSeed(), clientSeed: generateRandomSeed(), serverSeedHash: generateRandomSeed(),
        potentialWin: demoBetAmount * MULTIPLIERS[selectedDifficulty][0],
      });
      setCurrentLevel(1);
      return;
    }

    try {
      setIsPlacingBet(true);
      
      // Generate random seeds - these are bytes32 values (0x + 64 hex chars)
      const serverSeed = generateRandomSeed() as `0x${string}`;
      
      // Use custom client seed if available, otherwise generate random
      let clientSeed: `0x${string}`;
      const customClientSeed = typeof window !== 'undefined' ? localStorage.getItem('customClientSeed') : null;
      if (customClientSeed && customClientSeed.startsWith('0x') && customClientSeed.length === 66) {
        clientSeed = customClientSeed as `0x${string}`;
      } else {
        clientSeed = generateRandomSeed() as `0x${string}`;
      }
      
      // CRITICAL: Hash the serverSeed the same way Solidity does
      // Solidity: keccak256(abi.encodePacked(serverSeed)) where serverSeed is bytes32
      // viem: keccak256(serverSeed) - this hashes the hex string as raw bytes
      const serverSeedHash = keccak256(serverSeed);
      
      // Verify seeds are valid bytes32 format
      if (serverSeed.length !== 66 || clientSeed.length !== 66) {
        throw new Error("Invalid seed generation - wrong length");
      }

      logDebug("Placing bet", { betAmount, difficulty: selectedDifficulty });
      
      // Place bet on contract FIRST - this will throw if it fails
      const txHash = await placeBet(selectedDifficulty, clientSeed, serverSeedHash, parseEther(betAmount.toString()));
      logDebug("Bet placed", { txHash: shortHash(String(txHash)) });
      
      // Only store seeds AFTER successful bet placement
      localStorage.setItem("clientSeed", clientSeed);
      localStorage.setItem("serverSeed", serverSeed);
      localStorage.setItem("serverSeedHash", serverSeedHash);



       await fetch('/api/users/game-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerAddress: contractAddress,
      serverSeed,
      serverSeedHash,
      betAmount: parseFloat(betAmount.toString()), // Send as number (MNT)
      difficulty: selectedDifficulty,
    }),
  });
  console.log("Game state saved to MongoDB");
      
      // Refresh contract state to confirm
      await refetchContractState();
      
      // Update UI state - multiplier starts at 1e18 (1x) at level 0
      setGameState({
        phase: "playing", 
        betAmount, 
        difficulty: selectedDifficulty, 
        currentLevel: 0,
        // multiplier: 1e18, // Contract starts at 1e18 (1x)
        multiplier: MULTIPLIERS[selectedDifficulty][0] * 1e18, // Use level 1 multiplier
        doors: initializeDoors(selectedDifficulty),
        serverSeed, 
        clientSeed, 
        serverSeedHash, 
        potentialWin: betAmount, // At level 0, potential win = bet amount (1x)
      });
      setCurrentLevel(1);
    } catch (error: any) {
      console.error("=== BET FAILED ===", error);
      // Clear seeds on failure
      localStorage.removeItem("serverSeed");
      localStorage.removeItem("clientSeed");
      localStorage.removeItem("serverSeedHash");
      toast.error(error.message || "Failed to place bet.");
    } finally {
      setIsPlacingBet(false);
    }
  }, [amount, balance, selectedDifficulty, isDemo, contractAddress, placeBet, initializeDoors, refetchContractState]);

  const handleDoorClick = useCallback(async (index: number) => {
    if (gameState.phase !== "playing" || gameState.doors[index].isRevealed) return;
    if (!isDemo && (isSelectingDoor || isCashingOut || isPlacingBet)) return;

    if (isDemo) {
      const rugPosition = Math.floor(Math.random() * gameState.difficulty);
      const isRug = index === rugPosition;
      const newDoors = gameState.doors.map((d, i) => i === index ? { ...d, isRevealed: true, isRug, isSelected: true } : d);

      if (isRug) {
        setGameState((prev) => ({ ...prev, phase: "rugged", doors: newDoors }));
        setTimeout(() => setGameState((prev) => ({ ...prev, doors: newDoors.map((d, i) => ({ ...d, isRevealed: true, isRug: i === rugPosition })) })), 500);
      } else {
        setGameState((prev) => ({ ...prev, doors: newDoors }));
        const nextLevel = gameState.currentLevel + 1;
        // const newMultiplier = MULTIPLIERS[gameState.difficulty][nextLevel - 1] || gameState.multiplier;
       const newMultiplier = MULTIPLIERS[gameState.difficulty][nextLevel] || gameState.multiplier;
        const newPotentialWin = gameState.betAmount * newMultiplier;
        
        setTimeout(() => {
          if (nextLevel > 10) {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            setDemoBalance(prev => prev + newPotentialWin);
            setGameState((prev) => ({ ...prev, phase: "won", actualPayout: newPotentialWin }));
          } else {
            setGameState((prev) => ({ 
              ...prev, 
              currentLevel: nextLevel, 
              multiplier: newMultiplier, 
              doors: initializeDoors(gameState.difficulty), 
              potentialWin: newPotentialWin 
            }));
            setCurrentLevel(nextLevel);
          }
        }, 600);
      }
      return;
    }

    let serverSeed = gameState.serverSeed || localStorage.getItem("serverSeed");
    if (!serverSeed) { 
      toast.error("Session expired. Please cash out to recover your funds.");
      return; 
    }
    
    // Ensure serverSeed has 0x prefix and is exactly 66 chars (0x + 64 hex chars = 32 bytes)
    if (!serverSeed.startsWith('0x')) {
      serverSeed = `0x${serverSeed}`;
    }
    
    // Validate serverSeed is proper bytes32 format
    if (serverSeed.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(serverSeed)) {
      console.error("Invalid serverSeed format.");
      toast.error("Invalid seed format. Please start a new game.");
      return;
    }

    try {
      if (!isDemo) setIsSelectingDoor(true);
      // Get stored hash - prefer localStorage as it's set right after successful bet
      const storedHash = localStorage.getItem("serverSeedHash") || gameState.serverSeedHash;
      
      // Also get the hash from the contract for comparison
      const contractHash = contractGame?.serverSeedHash as string | undefined;
      
      // Compute hash the same way Solidity does: keccak256(abi.encodePacked(bytes32))
      // viem's keccak256 on a hex string hashes the raw bytes, which matches Solidity
      const computedHash = keccak256(serverSeed as `0x${string}`);

      logDebug("Selecting door", { index });
      
      // Verify hash matches the contract's stored hash (most important check)
      if (contractHash && computedHash.toLowerCase() !== contractHash.toLowerCase()) {
        console.error("HASH MISMATCH WITH CONTRACT!");
        toast.error("Seed doesn't match contract. Your session may have expired.");
        return;
      }
      
      // Also verify against localStorage for consistency
      if (storedHash && computedHash.toLowerCase() !== storedHash.toLowerCase()) {
        console.error("HASH MISMATCH WITH STORED!");
        // This is less critical - contract hash is the source of truth
        logDebug("Stored hash mismatch; contract hash matched, proceeding");
      }
      
      // Mark door as selected in UI
      setGameState((prev) => ({ ...prev, doors: prev.doors.map((d, i) => i === index ? { ...d, isSelected: true } : d) }));
      
      // Call contract
      const txHash = await selectDoor(index, serverSeed as `0x${string}`);
      logDebug("Door selected", { txHash: shortHash(String(txHash)) });
      
      // Refresh state from contract
      await refetchContractState();
    } catch (error: any) {
      console.error("=== DOOR SELECTION FAILED ===", error);
      // Reset door selection on failure
      setGameState((prev) => ({ ...prev, doors: prev.doors.map((d) => ({ ...d, isSelected: false })) }));
      toast.error(error.message || "Failed to select door. Please try again.");
    } finally {
      if (!isDemo) setIsSelectingDoor(false);
    }
  }, [gameState, isDemo, isSelectingDoor, isCashingOut, isPlacingBet, selectDoor, initializeDoors, refetchContractState, contractGame]);

  const handleCashOut = useCallback(async () => {
    if (gameState.phase !== "playing" || gameState.currentLevel < 1) return;
    if (isDemo) {
      const winAmount = gameState.potentialWin;
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      setDemoBalance(prev => prev + winAmount);
      setGameState((prev) => ({ ...prev, phase: "won", actualPayout: winAmount, currentLevel: prev.currentLevel - 1 }));
      return;
    }
    try {
      setIsCashingOut(true);
      await cashOut();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setGameState((prev) => ({ ...prev, phase: "won" }));
      if (contractAddress && !isDemo) {
  await fetch(`/api/users/game-state?address=${contractAddress}`, { method: 'DELETE' });
  console.log("Game session deleted after manual cashout");
}
    } catch (error: any) {
      toast.error(error.message || "Failed to cash out.");
    } finally {
      setIsCashingOut(false);
    }
  }, [gameState.phase, gameState.currentLevel, isDemo, cashOut]);

  const handlePlayAgain = useCallback(() => {
    localStorage.removeItem("gameState");
    localStorage.removeItem("serverSeed");
    localStorage.removeItem("clientSeed");
    setGameState({ phase: "idle", betAmount: 0, difficulty: selectedDifficulty, currentLevel: 0, multiplier: 1, doors: [], potentialWin: 0 });
    setCurrentLevel(1);
    setAmount(""); // Clear bet amount
  }, [selectedDifficulty]);

  // Reset demo balance when it gets too low
  const handleResetDemoBalance = useCallback(() => {
    setDemoBalance(10);
  }, []);

  const handleExit = () => { if (isDemo && onExitDemo) onExitDemo(); else logout(); };
  const handleLevelChange = (direction: "up" | "down") => {
    if (direction === "up" && currentLevel < 15) setCurrentLevel((p) => p + 1);
    if (direction === "down" && currentLevel > 1) setCurrentLevel((p) => p - 1);
  };

  // Mobile tab state
  const [activeTab, setActiveTab] = useState<'game' | 'leaderboard'>('game');

  return (
    <div className="h-screen bg-grid flex flex-col overflow-hidden" style={{ backgroundColor: "var(--color-bg-dark)" }}>
      <Header isGame isDemo={isDemo} onExit={handleExit} onOpenHowItWorks={() => setShowHowItWorks(true)} />
      
      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-4 py-2 sm:py-3 overflow-hidden flex flex-col">
        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 h-full">
          <div className="lg:col-span-8 flex flex-col gap-3">
            <GameCard
              gameState={gameState} isDemo={isDemo} currentLevel={currentLevel}
              selectedDifficulty={selectedDifficulty} gameMessage={gameMessage}
              onDoorClick={handleDoorClick} onLevelChange={handleLevelChange}
              disabledDoors={!isDemo && (isSelectingDoor || isCashingOut)}
            />
            <ControlPanel
              gameState={gameState} isDemo={isDemo} balance={balance} amount={amount}
              setAmount={setAmount} selectedDifficulty={selectedDifficulty}
              setSelectedDifficulty={setSelectedDifficulty} maxBet={maxBet}
              isPlacingBet={isPlacingBet} isCashingOut={isCashingOut}
              isSelectingDoor={isSelectingDoor}
              onStartGame={handleStartGame} onCashOut={handleCashOut}
              onPlayAgain={handlePlayAgain} onLogin={login}
              onOpenProvablyFair={() => setShowProvablyFair(true)}
              onResetDemoBalance={isDemo ? handleResetDemoBalance : undefined}
            />
          </div>
          <div className="lg:col-span-4 h-full"><Leaderboard /></div>
        </div>

        {/* Mobile Layout */}
        <div className="flex lg:hidden flex-col flex-1 overflow-hidden">
          {activeTab === 'game' ? (
            <div className="flex flex-col flex-1">
              {/* Game area takes remaining space but with max height */}
              <div className="flex-1 min-h-0 max-h-[60vh]">
                <GameCard
                  gameState={gameState} isDemo={isDemo} currentLevel={currentLevel}
                  selectedDifficulty={selectedDifficulty} gameMessage={gameMessage}
                  onDoorClick={handleDoorClick} onLevelChange={handleLevelChange}
                  disabledDoors={!isDemo && (isSelectingDoor || isCashingOut)}
                />
              </div>
              {/* Control panel fixed at bottom with margin */}
              <div className="shrink-0 mt-3 mb-3">
                <ControlPanel
                  gameState={gameState} isDemo={isDemo} balance={balance} amount={amount}
                  setAmount={setAmount} selectedDifficulty={selectedDifficulty}
                  setSelectedDifficulty={setSelectedDifficulty} maxBet={maxBet}
                  isPlacingBet={isPlacingBet} isCashingOut={isCashingOut}
                  isSelectingDoor={isSelectingDoor}
                  onStartGame={handleStartGame} onCashOut={handleCashOut}
                  onPlayAgain={handlePlayAgain} onLogin={login}
                  onOpenProvablyFair={() => setShowProvablyFair(true)}
                  onResetDemoBalance={isDemo ? handleResetDemoBalance : undefined}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <Leaderboard />
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation - Styled like RugRumble */}
      <div className="lg:hidden shrink-0 border-t-2 border-lime-400 bg-lime-400">
        <div className="flex">
          <button
            onClick={() => setActiveTab('game')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
              activeTab === 'game' ? 'bg-lime-500' : 'bg-lime-400'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              activeTab === 'game' ? 'bg-purple-600' : 'bg-zinc-800'
            }`}>
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="8" cy="12" r="2" fill="currentColor" />
                <path d="M14 10h4M16 8v4" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <span className={`text-[10px] font-bold ${activeTab === 'game' ? 'text-black' : 'text-zinc-700'}`}>GAME</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
              activeTab === 'leaderboard' ? 'bg-lime-500' : 'bg-lime-400'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              activeTab === 'leaderboard' ? 'bg-purple-600' : 'bg-zinc-800'
            }`}>
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM17 3a2 2 0 00-2 2v14a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2z" />
              </svg>
            </div>
            <span className={`text-[10px] font-bold ${activeTab === 'leaderboard' ? 'text-black' : 'text-zinc-700'}`}>LEADERBOARD</span>
          </button>
        </div>
      </div>

      {/* Footer - Hidden on mobile */}
      <div className="hidden lg:block">
        <Footer onOpenHowItWorks={() => setShowHowItWorks(true)} />
      </div>
      
      {/* Modals */}
      <HowItWorksModal 
        isOpen={showHowItWorks} 
        onClose={() => setShowHowItWorks(false)} 
      />
      <ProvablyFairModal
        isOpen={showProvablyFair}
        onClose={() => setShowProvablyFair(false)}
        clientSeed={gameState.clientSeed}
        serverSeedHash={gameState.serverSeedHash}
        serverSeed={gameState.phase !== "playing" ? gameState.serverSeed : undefined}
        isGameActive={gameState.phase === "playing"}
        onClientSeedChange={(seed) => {
          // Update localStorage is handled in modal, just refresh if needed
          if (typeof window !== 'undefined') {
            localStorage.setItem('customClientSeed', seed)
          }
        }}
      />
    </div>
  );
}
