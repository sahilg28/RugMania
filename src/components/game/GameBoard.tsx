"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RugDoor } from "./RugDoor";
import { Leaderboard } from "./Leaderboard";
import { GameState, DoorState, Difficulty } from "@/types/game";
import { generateRandomSeed, cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Wallet, Play } from "lucide-react";
import confetti from "canvas-confetti";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { createPublicClient, http, fallback, formatEther, keccak256 } from "viem";
import { mantleSepolia } from "@/config/chains";
import { useWatchContractEvent } from "wagmi";
import ABI from "@/lib/contract/abi.json";
import { CONTRACT_ADDRESSES } from "@/config/chains";

import { parseEther } from "viem";
import { useRugMania } from "@/hooks/useMyContract";
import { toast } from "react-toastify";

// Create a public client for reading balance with fallback RPCs
const publicClient = createPublicClient({
  chain: mantleSepolia,
  transport: fallback([
    http('https://rpc.sepolia.mantle.xyz', {
      retryCount: 3,
      retryDelay: 1000,
      timeout: 30000,
    }),
    http('https://mantle-sepolia.blockpi.network/v1/rpc/public', {
      retryCount: 1,
      retryDelay: 5000,
      timeout: 10000,
    }),
    http('https://rpc.ankr.com/mantle_sepolia', {
      retryCount: 1,
      retryDelay: 5000,
      timeout: 10000,
    }),
  ]),
});

// Event polling hook for contract events
function useContractEventPolling({
  address,
  eventName,
  args,
  enabled,
  onLogs,
  onError,
  pollingInterval = 3000,
}: {
  address: `0x${string}`;
  eventName: string;
  args?: any;
  enabled?: boolean;
  onLogs: (logs: any[]) => void;
  onError?: (error: Error) => void;
  pollingInterval?: number;
}) {
  const lastBlockNumber = useRef<bigint | null>(null);
  const isPolling = useRef(false);
  const processedEvents = useRef<Set<string>>(new Set()); // Track processed events

  useEffect(() => {
    if (!enabled || !address) return;

    const pollEvents = async () => {
      if (isPolling.current) return;
      isPolling.current = true;

      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = lastBlockNumber.current || currentBlock - BigInt(1);
        
        // Get logs using viem's getLogs method
        const logs = await publicClient.getLogs({
          address,
          event: {
            name: eventName,
            type: 'event',
            inputs: ABI.find((item: any) => item.type === 'event' && item.name === eventName)?.inputs || []
          },
          args,
          fromBlock,
          toBlock: currentBlock,
        });

        if (logs.length > 0) {
          // Filter out already processed events
          const newLogs = logs.filter(log => {
            const eventId = `${log.transactionHash}-${log.logIndex}`;
            if (processedEvents.current.has(eventId)) {
              return false; // Skip already processed event
            }
            processedEvents.current.add(eventId);
            return true;
          });
          
          if (newLogs.length > 0) {
            onLogs(newLogs);
          }
        }
        
        lastBlockNumber.current = currentBlock;
      } catch (error) {
        console.error(`Error polling ${eventName} events:`, error);
        // Log specific error details for debugging
        if (error instanceof Error) {
          console.error(`Error details: ${error.message}`);
          if (error.message.includes('400') || error.message.includes('Bad Request')) {
            console.warn('RPC endpoint returning 400 errors - will retry with fallback');
          }
        }
        
        // Fallback to simpler getLogs call if event parsing fails
        try {
          const currentBlock = await publicClient.getBlockNumber();
          const fromBlock = lastBlockNumber.current || currentBlock - BigInt(1);
          
          const logs = await publicClient.getLogs({
            address,
            fromBlock,
            toBlock: currentBlock,
          });

          // Filter logs by event signature
          const eventAbi = ABI.find((item: any) => item.type === 'event' && item.name === eventName);
          if (eventAbi) {
            const eventSignature = `0x${keccak256(`${eventName}(${eventAbi.inputs.map((input: any) => input.type).join(',')})`)}`;
            const filteredLogs = logs.filter(log => log.topics[0] === eventSignature);
            
            // Filter out already processed events
            const newLogs = filteredLogs.filter(log => {
              const eventId = `${log.transactionHash}-${log.logIndex}`;
              if (processedEvents.current.has(eventId)) {
                return false; // Skip already processed event
              }
              processedEvents.current.add(eventId);
              return true;
            });
            
            if (newLogs.length > 0) {
              onLogs(newLogs);
            }
          }
          
          lastBlockNumber.current = currentBlock;
        } catch (fallbackError) {
          console.error(`Error polling ${eventName} events (fallback failed):`, fallbackError);
          onError?.(fallbackError as Error);
        }
      } finally {
        isPolling.current = false;
      }
    };

    // Initial poll
    pollEvents();
    
    // Set up interval for continuous polling
    const interval = setInterval(pollEvents, pollingInterval);

    return () => {
      clearInterval(interval);
      isPolling.current = false;
    };
  }, [address, eventName, args, enabled, onLogs, onError, pollingInterval]);
}

// Motivational messages for gameplay
const GAME_MESSAGES = {
  idle: [
    "The more doors you pass, the more you win!",
    "Pick a door and test your luck!",
    "Ready to win big? Let's go!",
  ],
  playing: [
    "You're on fire! Keep going!🔥",
    "One more door, one more win!",
    "Trust your gut! Pick wisely!",
    "Good going! Don't stop now!",
    "Fortune favors the bold!",
    "More doors = More rewards!",
    "You got this! Keep pushing!",
    "Almost there! Go for glory!",
    "The next door could be gold!",
  ],
};

interface GameBoardProps {
  isDemo?: boolean;
  onExitDemo?: () => void;
}

export function GameBoard({ isDemo = false, onExitDemo }: GameBoardProps) {
  const { logout, login } = usePrivy();
  const { contractAddress } = useRugMania();
  const [realBalance, setRealBalance] = useState<bigint>(BigInt(0));
  const [gameState, setGameState] = useState<GameState>({
    phase: "idle",
    betAmount: 0,
    difficulty: 5,
    currentLevel: 0,
    multiplier: 1,
    doors: [],
    potentialWin: 0,
  });

  const { placeBet, selectDoor, cashOut, maxBet, maxLevels } = useRugMania();
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isCashingOut, setIsCashingOut] = useState(false);

  const [amount, setAmount] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(5);
  const [currentLevel, setCurrentLevel] = useState(1);

  // Load gameState from localStorage on mount
  useEffect(() => {
    if (isDemo) return; // Skip localStorage persistence for demo mode
    
    try {
      const savedGameState = localStorage.getItem("gameState");
      if (savedGameState) {
        const parsedState = JSON.parse(savedGameState);
        // Only restore if it's a valid playing state
        if ((parsedState.phase === "playing" || parsedState.phase === "won") && parsedState.serverSeed && parsedState.clientSeed) {
          setGameState(parsedState);
          setCurrentLevel(parsedState.currentLevel);
        }
      }
    } catch (error) {
      console.error("Failed to load gameState from localStorage:", error);
    }
  }, [isDemo]);

  // Save gameState to localStorage when it changes
  useEffect(() => {
    if (isDemo) return; // Skip localStorage persistence for demo mode
    
    if ((gameState.phase === "playing" || gameState.phase === "won") && gameState.serverSeed && gameState.clientSeed) {
      try {
        localStorage.setItem("gameState", JSON.stringify(gameState));
      } catch (error) {
        console.error("Failed to save gameState to localStorage:", error);
      }
    }
  }, [gameState, isDemo]);

  // Poll for BetPlaced events instead of using useWatchContractEvent
  useContractEventPolling({
    address: CONTRACT_ADDRESSES.doorRunner,
    eventName: 'BetPlaced',
    args: {
      player: contractAddress
    },
    enabled: !!contractAddress && !isDemo,
    onLogs: (logs) => {
      console.log('BetPlaced event in GameBoard:', logs);
      logs.forEach((log) => {
        const args = log.args as any;
        if (args) {
          const betAmount = parseFloat(formatEther(args.amount)).toFixed(4);
          const difficulty = args.diffculty;
          const txHash = log.transactionHash;
          
          console.log('BetPlaced - Raw difficulty from contract:', difficulty);
          console.log('BetPlaced - Difficulty type:', typeof difficulty);
          
          toast.success(
            `Bet Placed! ${betAmount} MNT on ${difficulty === 5 ? 'Easy' : difficulty === 4 ? 'Medium' : 'Hard'} mode`,
            {
              onClick: () => window.open(`https://sepolia.mantlescan.xyz/tx/${txHash}`, '_blank')
            }
          );
          
          // Update game state with actual contract values
          setGameState((prev) => ({
            ...prev,
            betAmount: parseFloat(betAmount),
            difficulty: difficulty as Difficulty,
          }));
        }
      });
    },
    onError: (error) => {
      console.error("BetPlaced polling error", error);
    }
  })

  // Poll for DoorSelected events instead of using useWatchContractEvent
  useContractEventPolling({
    address: CONTRACT_ADDRESSES.doorRunner,
    eventName: 'DoorSelected',
    args: {
      player: contractAddress
    },
    enabled: !!contractAddress && !isDemo,
    onLogs: (logs) => {
      console.log('DoorSelected event in GameBoard:', logs);
      logs.forEach((log) => {
        console.log("DoorSelected event in GameBoard:", log);
        const args = log.args as any;
        if (args && args.survived) {
          // Player survived the door selection
          const newLevel = Number(args.level);
          const newMultiplier = Number(args.newMultiplier) / 1e15; // Convert from basis points
          const txHash = log.transactionHash;
          
          // First, show the current doors with the selected door marked as survived
          setGameState((prev) => {
            // Find the door that was clicked (should be marked as isSelected)
            const selectedDoorIndex = prev.doors.findIndex(door => door.isSelected);
            const updatedDoors = prev.doors.map((door, index) => ({
              ...door,
              isRevealed: index === selectedDoorIndex,
              // isRevealed: true,
              isRug: false, // Survived, so not a rug
              isSelected: index === selectedDoorIndex
            }));
            
            console.log('DoorSelected - Updating game state:', {
              newLevel,
              prevLevel: prev.currentLevel,
              newMultiplier,
              prevMultiplier: prev.multiplier
            });
            
            return {
              ...prev,
              currentLevel: newLevel,
              // multiplier: newMultiplier,
              multiplier: Number(args.newMultiplier),
              // potentialWin: prev.betAmount * newMultiplier,
              potentialWin: prev.betAmount * (Number(args.newMultiplier) / 1e18) * 1e18,
              doors: updatedDoors,
            };
          });
          setCurrentLevel(newLevel);
          
          console.log('DoorSelected - setCurrentLevel called with:', newLevel);
          
          toast.success(
            `Level ${newLevel + 1} reached! ${(Number(args.newMultiplier) / 1e18).toFixed(2)}x multiplier`,
            {
              onClick: () => window.open(`https://sepolia.mantlescan.xyz/tx/${txHash}`, '_blank')
            }
          );
          
          // Check if player has reached max levels for on-chain mode
          if (maxLevels && newLevel >= Number(maxLevels)) {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            setGameState((prev) => ({
              ...prev,
              phase: "won",
            }));
            return; // Don't transition to next level since game is won
          }
          
          // After showing the winning door, transition to next level after a delay
          setTimeout(() => {
            setGameState((prev) => ({
              ...prev,
              doors: initializeDoors(prev.difficulty), // Fresh doors for next level
            }));
          }, 2500); // Show winning door for 1.5 seconds
        } else {
          // Player got rugged
          const txHash = log.transactionHash;
          
          // Show the selected door as a rug before transitioning to rugged state
          setGameState((prev) => {
            // Find the door that was clicked (should be marked as isSelected)
            const selectedDoorIndex = prev.doors.findIndex(door => door.isSelected);
            const updatedDoors = prev.doors.map((door, index) => ({
              ...door,
              isRevealed: true,
              isRug: index === selectedDoorIndex, // Selected door is the rug
              isSelected: index === selectedDoorIndex
            }));
            
            return {
              ...prev,
              doors: updatedDoors,
            };
          });
          
          toast.error(
            "You got rugged! Better luck next time!",
            {
              onClick: () => window.open(`https://sepolia.mantlescan.xyz/tx/${txHash}`, '_blank')
            }
          );
          
          // After showing the rug door, transition to rugged state after a delay
          setTimeout(() => {
            setGameState((prev) => ({
              ...prev,
              phase: "rugged",
              // Show all doors revealed with the rug
              doors: prev.doors.map((door) => ({
                ...door,
                isRevealed: true,
              }))
            }));
          }, 1500); // Show rug door for 1.5 seconds
        }
      });
    },
    onError: (error) => {
      console.error("DoorSelected polling error", error);
    }
  });

  // Poll for Rugged events instead of using useWatchContractEvent
  useContractEventPolling({
    address: CONTRACT_ADDRESSES.doorRunner,
    eventName: 'Rugged',
    args: {
      player: contractAddress
    },
    enabled: !!contractAddress && !isDemo,
    onLogs: (logs) => {
      console.log('Rugged event in GameBoard:', logs);
      logs.forEach((log) => {
        const txHash = log.transactionHash;
        
        // Show the selected door as a rug before transitioning to rugged state
        setGameState((prev) => {
          // Find the door that was clicked (should be marked as isSelected)
          const selectedDoorIndex = prev.doors.findIndex(door => door.isSelected);
          const updatedDoors = prev.doors.map((door, index) => ({
            ...door,
            isRevealed: true,
            isRug: index === selectedDoorIndex, // Selected door is the rug
            isSelected: index === selectedDoorIndex
          }));
          
          return {
            ...prev,
            doors: updatedDoors,
          };
        });
        
        toast.error(
          "You got rugged! Better luck next time!",
          {
            onClick: () => window.open(`https://sepolia.mantlescan.xyz/tx/${txHash}`, '_blank')
          }
        );
        
        // After showing the rug door, transition to rugged state after a delay
        setTimeout(() => {
          setGameState((prev) => ({
            ...prev,
            phase: "rugged",
            // Show all doors revealed with the rug
            doors: prev.doors.map((door) => ({
              ...door,
              isRevealed: true,
            }))
          }));
        }, 1500); // Show rug door for 1.5 seconds
      });
    },
    onError: (error) => {
      console.error("Rugged polling error", error);
    }
  });

  // Poll for CashOut events instead of using useWatchContractEvent
  useContractEventPolling({
    address: CONTRACT_ADDRESSES.doorRunner,
    eventName: 'CashOut',
    args: {
      player: contractAddress
    },
    enabled: !!contractAddress && !isDemo,
    onLogs: (logs) => {
      console.log('CashOut event in GameBoard:', logs);
      logs.forEach((log) => {
        const args = log.args as any;
        const txHash = log.transactionHash;
        if (args) {
          const payout = formatEther(args.payout);
          setGameState((prev) => ({
            ...prev,
            phase: "won",
            actualPayout: parseFloat(payout),
          }));
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          toast.success(
            `Cashed out! You won ${payout} MNT!`,
            {
              onClick: () => window.open(`https://sepolia.mantlescan.xyz/tx/${txHash}`, '_blank')
            }
          );
        }
      });
    },
    onError: (error) => {
      console.error("CashOut polling error", error);
    }
  });

  // Poll for MaxLevelAchieved events instead of using useWatchContractEvent
  useContractEventPolling({
    address: CONTRACT_ADDRESSES.doorRunner,
    eventName: 'MaxLevelAchieved',
    args: {
      player: contractAddress
    },
    enabled: !!contractAddress && !isDemo,
    onLogs: (logs) => {
      console.log('MaxLevelAchieved event in GameBoard:', logs);
      confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
      toast.success("Maximum level achieved! You're a legend!");
    },
    onError: (error) => {
      console.error("MaxLevelAchieved polling error", error);
    }
  });

  // Fetch real balance from embedded wallet
  useEffect(() => {
    const fetchBalance = async () => {
      if (!contractAddress || isDemo) return;
      try {
        const bal = await publicClient.getBalance({ address: contractAddress as `0x${string}` });
        setRealBalance(bal);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    };
    fetchBalance();
    // Poll every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [contractAddress, isDemo]);

  // Convert balance to number for game logic
  const balance = isDemo ? 10 : parseFloat(formatEther(realBalance));

  // Random motivational message based on game state
  const gameMessage = useMemo(() => {
    if (gameState.phase === "playing") {
      return GAME_MESSAGES.playing[
        Math.floor(Math.random() * GAME_MESSAGES.playing.length)
      ];
    }
    return GAME_MESSAGES.idle[
      Math.floor(Math.random() * GAME_MESSAGES.idle.length)
    ];
  }, [gameState.phase, gameState.currentLevel]);

  // Multipliers per difficulty: Easy (5 doors), Medium (4 doors), Hard (3 doors)
  // const MULTIPLIERS: Record<number, number[]> = {
  //   5: [1.18, 1.39, 1.65, 1.95, 2.3, 2.72, 3.21, 3.79, 4.48, 5.29], // Easy
  //   4: [1.25, 1.56, 1.95, 2.44, 3.05, 3.81, 4.77, 5.96, 7.45, 9.31], // Medium
  //   3: [1.45, 2.1, 3.05, 4.42, 6.41, 9.3, 13.48, 19.55, 28.35, 41.11], // Hard
  // };

   const MULTIPLIERS: Record<number, number[]> = {
  5: [1.00, 1.25, 1.56, 1.95, 2.44, 3.05, 3.81, 4.77, 5.96, 7.45], // Easy (5 doors)
  4: [1.00, 1.33, 1.78, 2.37, 3.16, 4.21, 5.61, 7.48, 9.97, 13.29], // Medium (4 doors)
  3: [1.00, 1.50, 2.25, 3.38, 5.06, 7.59, 11.39, 17.09, 25.63, 38.44], // Hard (3 doors)
};

  const initializeDoors = (count: number): DoorState[] => {
    return Array.from({ length: count }, (_, i) => ({
      index: i,
      isRevealed: false,
      isRug: false,
      isSelected: false,
    }));
  };

  const handleStartGame = useCallback(async () => {
    // In demo mode, skip validation and use dummy bet
    console.log("embedded address", contractAddress);
    const betAmount = isDemo ? 1 : parseFloat(amount);
    if (
      !isDemo &&
      (isNaN(betAmount) ||
        betAmount < 0.1 ||
        betAmount > 10 ||
        betAmount > balance)
    )
      return;
    // if (!isDemo && !address) return; // must have wallet
    if (!isDemo && !contractAddress) return;
    // Demo mode: keep your existing local-only behavior
    if (isDemo) {
      const doors = initializeDoors(selectedDifficulty);
      setGameState({
        phase: "playing",
        betAmount,
        difficulty: selectedDifficulty as Difficulty,
        currentLevel: 1,
        multiplier: MULTIPLIERS[selectedDifficulty][0],
        doors,
        serverSeed: generateRandomSeed(),
        clientSeed: generateRandomSeed(),
        serverSeedHash: generateRandomSeed(),
        potentialWin: betAmount * MULTIPLIERS[selectedDifficulty][0],
      });
      setCurrentLevel(1);
      return;
    }

    try {
      setIsPlacingBet(true);

      // 1) generate seeds (your helper must return bytes32-like hex strings)
      const clientSeed = generateRandomSeed(); // e.g. `0x...` 32 bytes
      const serverSeed = generateRandomSeed();
      const serverSeedHash = keccak256(serverSeed); // Hash of serverSeed
      // Store serverSeed for later use
      localStorage.setItem("clientSeed", clientSeed);
      localStorage.setItem("serverSeed", serverSeed);
      
      // 2) amount -> wei
      const valueWei = parseEther(betAmount.toString()); // viem utility [web:45]

      // 3) on-chain transaction
      const tx = await placeBet(
        selectedDifficulty, // doors (3/4/5)
        clientSeed as `0x${string}`,
        serverSeedHash as `0x${string}`,
        valueWei
      );

      const doors = initializeDoors(selectedDifficulty);
      setGameState({
        phase: "playing",
        betAmount,
        difficulty: selectedDifficulty as Difficulty,
        currentLevel: 0,
        multiplier: MULTIPLIERS[selectedDifficulty][0] * 1e18,
        doors,
        serverSeed, // keep for selectDoor later
        clientSeed,
        serverSeedHash,
        potentialWin: betAmount * MULTIPLIERS[selectedDifficulty][0] * 1e18,
      });
      setCurrentLevel(1);
    } catch (error: any) {
      console.error("placeBet failed", error);
      // if (error.message.includes("NoHouseLiquidity") || error.message.includes("HouseRiskTooHigh")) {
     if (error.message.includes("NoHouseLiquidity") || error.message.includes("House risk too high")) {
      toast.error("The house does not have enough liquidity to accept your bet. Lower this bet amount or please try again later.");
      } else if (error.message.includes("GameAlreadyActive")) {
        toast.error("You already have an active game. Please cash out or lose your previous game before starting a new one.");
      } else if (error.message.includes("BetBelowMinimum")) {
        toast.error("The bet amount is below the minimum required (0.1 MNT).");
      } else if (error.message.includes("BetTooHigh")) {
        toast.error("The bet amount is above the maximum allowed.");
      } else {
        console.log("Transaction failed: " + error.message);
        toast.error("Failed to place bet. Please try again.");
      }
      // toast.error(err.message);
      // toast.error("Failed to place bet. Please try again.");
    } finally {
      setIsPlacingBet(false);
    }
  }, [
    amount,
    balance,
    selectedDifficulty,
    isDemo,
    contractAddress,
    MULTIPLIERS,
    placeBet,
  ]);


  const handleDoorClick = useCallback(
    async (index: number) => {
      if (gameState.phase !== "playing") return;
      if (gameState.doors[index].isRevealed) return;

      // DEMO MODE: keep existing local RNG behavior
      if (isDemo) {
        const rugPosition = Math.floor(Math.random() * gameState.difficulty);
        const isRug = index === rugPosition;

        const newDoors = gameState.doors.map((door, i) => {
          if (i === index) {
            return { ...door, isRevealed: true, isRug, isSelected: true };
          }
          return door;
        });

        if (isRug) {
          setGameState((prev) => ({
            ...prev,
            phase: "rugged",
            doors: newDoors,
          }));
          setTimeout(() => {
            const allRevealed = newDoors.map((door, i) => ({
              ...door,
              isRevealed: true,
              isRug: i === rugPosition,
            }));
            setGameState((prev) => ({ ...prev, doors: allRevealed }));
          }, 500);
        } else {
          setGameState((prev) => ({ ...prev, doors: newDoors }));

          const nextLevel = gameState.currentLevel + 1;
          const newMultiplier =
            MULTIPLIERS[gameState.difficulty][nextLevel - 1] ||
            gameState.multiplier;

          setTimeout(() => {
            if (nextLevel > 10) {
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
              setGameState((prev) => ({
                ...prev,
                phase: "won",
              }));
            } else {
              const freshDoors = initializeDoors(gameState.difficulty);
              setGameState((prev) => ({
                ...prev,
                currentLevel: nextLevel,
                multiplier: newMultiplier,
                doors: freshDoors,
                potentialWin: prev.betAmount * newMultiplier,
              }));
              setCurrentLevel(nextLevel);
            }
          }, 600);
        }

        return;
      }

      // REAL MODE: call contract selectDoor
      // Need serverSeed that was stored when placeBet was called
      let serverSeed = gameState.serverSeed;
      
      // Fallback to localStorage if not in gameState (e.g., after page refresh)
      if (!serverSeed) {
        const storedSeed = localStorage.getItem("serverSeed");
        if (!storedSeed) {
          console.error("No serverSeed found in gameState or localStorage, cannot call selectDoor");
          toast.error("Game state corrupted. Please start a new game.");
          return;
        }
        serverSeed = storedSeed;
      }

      try {
        // Optimistically mark the clicked door as selected
        setGameState((prev) => ({
          ...prev,
          doors: prev.doors.map((door, i) =>
            i === index ? { ...door, isSelected: true } : door
          ),
        }));


        // On-chain selectDoor, contract decides rug door & updates game
        const tx = await selectDoor(
          index,
          serverSeed as `0x${string}`
        );

        // Optional: wait for tx to be mined and then refresh on-chain game state
        // using getGame/getCurrentPayout via your hook.
        // For now, you can keep local animations or plug in a refetch after tx.
        console.log("selectDoor tx sent", tx);
      } catch (error) {
        console.error("selectDoor failed", error);
        // You could reset isSelected or show an error toast here
        toast.error("Failed to select door. Please try again.");
      }
    },
    [
      gameState,
      isDemo,
      selectDoor,
      MULTIPLIERS,
      initializeDoors,
      setCurrentLevel,
    ]
  );

  const handleCashOut = useCallback(async () => {
    console.log('handleCashOut called:', {
      phase: gameState.phase,
      currentLevel: gameState.currentLevel,
      condition: gameState.phase !== "playing" || gameState.currentLevel <= 1
    });
    if (gameState.phase !== "playing" || gameState.currentLevel <1) return;

    if (isDemo) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setGameState((prev) => ({ ...prev, phase: "won" }));
    }
    try {
      setIsCashingOut(true);
      const tx = await cashOut();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setGameState((prev) => ({ ...prev, phase: "won" }));
    } catch (error: any) {
      console.error("cashOut failed", error);
      
      // Handle specific contract errors
      if (error.message.includes("NoActiveGame")) {
        toast.error("No active game found. Please start a new game first.");
      } else if (error.message.includes("NothingToCashOut")) {
        toast.error("Nothing to cash out. You need to win at least one level first.");
      } else if (error.message.includes("InsufficientHouseBalance")) {
        toast.error("Insufficient house balance for payout. Please try again later.");
      } else if (error.message.includes("TranferFailed")) {
        toast.error("Transfer failed. Please check your wallet and try again.");
      } else {
        console.log("Cashout failed: " + error.message);
        toast.error("Failed to cash out. Please try again.");
      }
    } finally {
      setIsCashingOut(false);
    }
  }, [gameState.phase, gameState.currentLevel, isDemo, cashOut]);

  const handlePlayAgain = useCallback(() => {
    // Clear localStorage game state and seeds
    localStorage.removeItem("gameState");
    localStorage.removeItem("serverSeed");
    localStorage.removeItem("clientSeed");
    
    setGameState({
      phase: "idle",
      betAmount: 0,
      difficulty: selectedDifficulty as Difficulty,
      currentLevel: 0,
      multiplier: 1,
      doors: [],
      potentialWin: 0,
      serverSeed: undefined,
      clientSeed: undefined,
      serverSeedHash: undefined,
    });
    setCurrentLevel(1);
  }, [selectedDifficulty]);

  const handleExit = () => {
    if (isDemo && onExitDemo) onExitDemo();
    else logout();
  };

  const handleLevelChange = (direction: "up" | "down") => {
    if (direction === "up" && currentLevel < 10)
      setCurrentLevel((prev) => prev + 1);
    if (direction === "down" && currentLevel > 1)
      setCurrentLevel((prev) => prev - 1);
  };

  return (
    <div
      className="h-screen bg-grid flex flex-col overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-dark)" }}
    >
      <Header isGame isDemo={isDemo} onExit={handleExit} />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-3 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* Game Area - Left */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            {/* Game Card with Grid Background */}
            <div
              className={cn(
                "flex-1 flex flex-col transition-colors rounded-xl border-2 relative overflow-hidden",
                gameState.phase === "rugged"
                  ? "border-red-500"
                  : gameState.phase === "won"
                  ? "border-green-500"
                  : "border-lime-400"
              )}
              style={{
                backgroundColor: "#0a0a12",
                backgroundImage:
                  "linear-gradient(rgba(163, 230, 53, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(163, 230, 53, 0.03) 1px, transparent 1px)",
                backgroundSize: "30px 30px",
              }}
            >
              {/* Message Banner */}
              <div className="flex justify-center pt-4 pb-2 relative z-10">
                {gameState.phase === "rugged" ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="px-4 py-2 rounded-full border-2 border-red-500 text-sm text-red-400 bg-red-500/10 flex items-center gap-2 font-medium"
                  >
                    <span>⚠️</span>
                    Rug pulled! That wasn&apos;t the lucky door
                  </motion.div>
                ) : gameState.phase === "won" ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="px-4 py-2 rounded-full border-2 border-green-500 text-sm text-green-400 bg-green-500/10 flex items-center gap-2 font-medium"
                  >
                    <span>😊</span>
                    Cashed out successfully! Enjoy your winnings
                  </motion.div>
                ) : (
                  <motion.div
                    key={gameMessage}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-5 py-2 rounded-full border-2 border-zinc-700 text-sm text-zinc-300 bg-zinc-800/80 font-medium"
                  >
                    {gameMessage}
                  </motion.div>
                )}
              </div>

              {/* Game Content */}
              <div className="relative flex-1 px-4 pb-3 flex flex-col items-center justify-center">
                {/* Level Controls - Right Side (only active in idle state) */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
                  <button
                    onClick={() => handleLevelChange("up")}
                    disabled={currentLevel >= 10 || gameState.phase !== "idle"}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-lg border-2 transition-all",
                      currentLevel < 10 && gameState.phase === "idle"
                        ? "bg-lime-400 text-black border-black shadow-brutal-sm hover:bg-lime-300 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed"
                    )}
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleLevelChange("down")}
                    disabled={currentLevel <= 1 || gameState.phase !== "idle"}
                    className={cn(
                      "w-10 h-10 flex items-center justify-center rounded-lg border-2 transition-all",
                      currentLevel > 1 && gameState.phase === "idle"
                        ? "bg-lime-400 text-black border-black shadow-brutal-sm hover:bg-lime-300 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed"
                    )}
                  >
                    <ArrowDown className="w-5 h-5" />
                  </button>
                </div>

                {/* Game Stage - Vertical Stack: Level Badge → Door Container → Floor Platform */}
                <div className="relative flex flex-col items-center justify-end flex-1">
                  {/* Level + Doors + Floor Stack */}
                  <div className="relative flex flex-col items-center w-full max-w-[550px] pb-12">
                    {/* Level Badge - Floating above doors */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={
                          gameState.phase === "playing"
                            ? `playing-${gameState.currentLevel}`
                            : `idle-${currentLevel}`
                        }
                        initial={{ scale: 0.8, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: -50 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                        }}
                        className="relative z-20 -mb-3 inline-flex items-center gap-2 px-6 py-3 bg-lime-400 text-black rounded-lg border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                      >
                        <span className="text-sm font-bold">
                          Lvl{" "}
                          {gameState.phase === "playing"
                            ? (gameState.currentLevel + 1)
                            : gameState.phase === "won"
                            ? (gameState.currentLevel + 1)
                            : currentLevel}
                          :
                        </span>
                        <span className="text-2xl font-black">
                          {gameState.phase === "playing"
                            ? (isDemo ? gameState.multiplier : (gameState.multiplier / 1e18)).toFixed(2)
                            : gameState.phase === "won"
                            ? (isDemo ? gameState.multiplier : (gameState.multiplier / 1e18)).toFixed(2)
                            : MULTIPLIERS[selectedDifficulty][
                                (currentLevel || 1) - 1
                              ]?.toFixed(2) || "1.18"}
                          x
                        </span>
                      </motion.div>
                    </AnimatePresence>

                    {/* Door Container */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={
                          gameState.phase === "playing"
                            ? `doors-${gameState.currentLevel}`
                            : `doors-idle-${currentLevel}`
                        }
                        initial={{ scale: 0.85, opacity: 0, y: 40 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.85, opacity: 0, y: -40 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                        }}
                        className={cn(
                          "relative z-10 rounded-xl border-2 transition-colors",
                          gameState.phase === "rugged"
                            ? "border-red-500 bg-red-950/30"
                            : gameState.phase === "won"
                            ? "border-green-500 bg-green-950/30"
                            : "border-lime-400 bg-[rgba(91,33,182,0.25)]"
                        )}
                      >
                        <div className="px-6 py-5">
                          {/* Playing State - Interactive Doors */}
                          {gameState.phase === "playing" && (
                            <div
                              className={cn(
                                "grid gap-4",
                                gameState.difficulty === 5 && "grid-cols-5",
                                gameState.difficulty === 4 && "grid-cols-4",
                                gameState.difficulty === 3 && "grid-cols-3"
                              )}
                            >
                              {gameState.doors.map((door, index) => (
                                <RugDoor
                                  key={index}
                                  door={door}
                                  onClick={() => handleDoorClick(index)}
                                  disabled={gameState.phase !== "playing"}
                                />
                              ))}
                            </div>
                          )}

                          {/* Idle State - Preview Doors */}
                          {gameState.phase === "idle" && (
                            <div
                              className={cn(
                                "grid gap-4",
                                selectedDifficulty === 5 && "grid-cols-5",
                                selectedDifficulty === 4 && "grid-cols-4",
                                selectedDifficulty === 3 && "grid-cols-3"
                              )}
                            >
                              {Array.from(
                                { length: selectedDifficulty },
                                (_, i) => (
                                  <div
                                    key={i}
                                    className="w-[70px] h-[100px] sm:w-[80px] sm:h-[115px] rounded-t-[30px] rounded-b-md bg-gradient-to-b from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] flex flex-col items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),0_4px_12px_rgba(0,0,0,0.3)] border-2 border-[#5b21b6] hover:border-white/50 transition-colors cursor-pointer"
                                  >
                                    <span className="text-white font-black text-sm tracking-wide">
                                      WIN!
                                    </span>
                                    <span className="text-white/70 font-bold text-xs">
                                      OR
                                    </span>
                                    <span className="text-white font-black text-sm tracking-wide">
                                      RUG!
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          {/* Rugged State - Show ALL doors with rug revealed */}
                          {gameState.phase === "rugged" && (
                            <div
                              className={cn(
                                "grid gap-4",
                                gameState.difficulty === 5 && "grid-cols-5",
                                gameState.difficulty === 4 && "grid-cols-4",
                                gameState.difficulty === 3 && "grid-cols-3"
                              )}
                            >
                              {gameState.doors.map((door, index) => (
                                <RugDoor
                                  key={index}
                                  door={door}
                                  onClick={() => {}}
                                  disabled={true}
                                />
                              ))}
                            </div>
                          )}

                          {/* Won/Cashed Out State - Show doors like rugged */}
                          {gameState.phase === "won" && (
                            <div
                              className={cn(
                                "grid gap-4",
                                gameState.difficulty === 5 && "grid-cols-5",
                                gameState.difficulty === 4 && "grid-cols-4",
                                gameState.difficulty === 3 && "grid-cols-3"
                              )}
                            >
                              {gameState.doors.map((door, index) => (
                                <RugDoor
                                  key={index}
                                  door={door}
                                  onClick={() => {}}
                                  disabled={true}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Static Floor Platform - Fixed at bottom of game card */}
              <div
                className="absolute bottom-0 left-0 right-0 h-16 z-0 transition-colors"
                style={{
                  background:
                    gameState.phase === "rugged"
                      ? "linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)"
                      : gameState.phase === "won"
                      ? "linear-gradient(180deg, #166534 0%, #14532d 100%)"
                      : "linear-gradient(180deg, #5b21b6 0%, #2e1065 100%)",
                  clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)",
                }}
              />
            </div>

            {/* Control Panel */}
            <div
              className={cn(
                "shrink-0 rounded-xl border-2 bg-zinc-900 p-4 transition-colors",
                gameState.phase === "rugged"
                  ? "border-red-500"
                  : gameState.phase === "won"
                  ? "border-green-500"
                  : "border-lime-400"
              )}
            >
              {gameState.phase === "idle" ? (
                isDemo ? (
                  /* DEMO MODE - Idle: Simple multiplier and PLAY button */
                  <div className="space-y-3">
                    <div className="flex items-center justify-center">
                      <span className="text-zinc-400 text-sm font-medium">
                        Multiplier:{" "}
                      </span>
                      <span className="text-white font-bold text-lg ml-1">
                        1.00x
                      </span>
                    </div>
                    <button
                      onClick={handleStartGame}
                      className="w-full py-4 text-base bg-lime-400 text-black font-bold rounded-xl border-2 border-black shadow-brutal-sm hover:bg-lime-300 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                    >
                      PLAY
                    </button>
                  </div>
                ) : (
                  /* REAL MODE - Idle: Full betting controls */
                  <div className="space-y-3">
                    {/* Labels Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-400 text-xs font-medium">
                          Wallet Balance:
                        </span>
                        <span className="text-white font-bold text-sm">
                          {balance.toFixed(2)} MNT
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-zinc-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        <span className="text-zinc-400 text-xs font-medium">
                          Difficulty
                        </span>
                      </div>
                    </div>

                    {/* Input Row */}
                    <div className="flex gap-3">
                      <div className="flex-1 flex items-center rounded-lg border-2 border-zinc-700 overflow-hidden bg-zinc-800">
                        <input
                          type="text"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="flex-1 px-4 py-2.5 text-white font-medium text-sm outline-none placeholder:text-zinc-500 bg-transparent"
                          placeholder="Amount"
                        />
                        <button
                          onClick={() => setAmount("1")}
                          className="px-3 py-1.5 mx-0.5 text-zinc-300 text-xs font-bold rounded border-2 border-zinc-600 hover:border-lime-400 hover:text-lime-400 transition-colors bg-zinc-800"
                        >
                          1
                        </button>
                        <button
                          onClick={() => setAmount("10")}
                          className="px-3 py-1.5 mr-1 text-zinc-300 text-xs font-bold rounded border-2 border-zinc-600 hover:border-lime-400 hover:text-lime-400 transition-colors bg-zinc-800"
                        >
                          10
                        </button>
                      </div>
                      <select
                        value={selectedDifficulty}
                        onChange={(e) =>
                          setSelectedDifficulty(
                            Number(e.target.value) as Difficulty
                          )
                        }
                        className="w-[130px] px-3 py-2.5 bg-lime-400 text-black text-sm font-bold rounded-lg border-2 border-black cursor-pointer shadow-brutal-sm hover:bg-lime-300 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 10px center",
                          paddingRight: "32px",
                          appearance: "none",
                        }}
                      >
                        <option value={5}>Easy</option>
                        <option value={4}>Medium</option>
                        <option value={3}>Hard</option>
                      </select>
                    </div>

                    {/* Place Bet Row */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleStartGame}
                        className="flex-1 py-3 text-zinc-400 font-bold text-sm rounded-lg border-2 border-zinc-700 bg-zinc-800 hover:bg-lime-400 hover:text-black hover:border-black transition-all disabled:opacity-50"
                        disabled={
                          !amount ||
                          parseFloat(amount) < 0.1 ||
                          // parseFloat(amount) > 10 ||
                          parseFloat(amount) > (maxBet ? parseFloat(formatEther(maxBet)) : 10) ||
                          parseFloat(amount) > balance
                        }
                      >
                        {!amount ||
                        parseFloat(amount) <= 0 ||
                        parseFloat(amount) < 0.1
                          ? "Min Bet: 0.1 MNT"
                          : parseFloat(amount) > (maxBet ? parseFloat(formatEther(maxBet)) : 10)
                          ? `Max Bet: ${maxBet ? parseFloat(formatEther(maxBet)).toFixed(2) : '10'} MNT`
                          : parseFloat(amount) > balance
                          ? "Insufficient Balance"
                          : "Place Bet"}
                      </button>
                      <button
                        onClick={handleStartGame}
                        disabled={
                          !amount ||
                          parseFloat(amount) < 0.1 ||
                          parseFloat(amount) > (maxBet ? parseFloat(formatEther(maxBet)) : 10) ||
                          parseFloat(amount) > balance
                        }
                        className="w-12 py-3 bg-lime-400 text-black font-bold rounded-lg border-2 border-black flex items-center justify-center disabled:opacity-50 shadow-brutal-sm hover:bg-lime-300 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                      >
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              ) : gameState.phase === "playing" ? (
                <div className="space-y-3">
                  {/* Multiplier Row (and Win for real mode) */}
                  <div
                    className={cn(
                      "flex items-center px-2",
                      isDemo ? "justify-center" : "justify-between"
                    )}
                  >
                    <div className="text-zinc-400 text-sm">
                      <span className="font-medium">Multiplier: </span>
                      <span className="text-white font-bold">
                        {(isDemo ? gameState.multiplier : (gameState.multiplier / 1e18)).toFixed(2)}x
                      </span>
                    </div>
                    {!isDemo && (
                      <div className="text-zinc-400 text-sm">
                        <span className="font-medium">Win: </span>
                        <span className="text-lime-400 font-bold">
                          {(gameState.potentialWin / 1e18).toFixed(8)} MNT
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Cash Out Button */}
                  <button
                    onClick={handleCashOut}
                    disabled={gameState.currentLevel <1 || isCashingOut}
                    className="w-full py-4 text-base bg-zinc-800 text-white font-bold rounded-xl border-2 border-zinc-700 hover:bg-lime-400 hover:text-black hover:border-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Cashout enabled: ${gameState.currentLevel >= 1 && gameState.phase === 'playing' && !isCashingOut}`}
                  >
                    {isCashingOut ? "Cashing out..." : "CASH OUT"} (Level {gameState.currentLevel + 1})
                  </button>
                </div>
              ) : gameState.phase === "rugged" ? (
                <div className="text-center space-y-4 py-2">
                  <h3 className="text-white font-black text-xl tracking-wide">
                    YOU GOT RUGGED!
                  </h3>
                  {isDemo ? (
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={login}
                        className="px-6 py-3 text-base bg-lime-400 text-black font-bold rounded-lg border-2 border-lime-400 hover:bg-lime-300 transition-all flex items-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        Sign In
                      </button>
                      <button
                        onClick={handlePlayAgain}
                        className="px-6 py-3 text-base bg-zinc-800 text-white font-bold rounded-lg border-2 border-zinc-700 hover:border-zinc-500 transition-all flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Play Demo
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={handlePlayAgain}
                        className="flex-1 py-3 text-base bg-lime-400 text-black font-bold rounded-lg border-2 border-black shadow-brutal-sm hover:bg-lime-300 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                      >
                        Play Again
                      </button>
                      <button
                        onClick={() =>
                          window.open(
                            `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                              `I just got RUGGED in RugMania 💀 This game is brutal. Think you can survive longer? ${window.location.href}`
                            )}`,
                            "_blank"
                          )
                        }
                        className="flex-1 py-3 text-base bg-black text-white font-bold rounded-lg border-2 border-zinc-700 hover:border-white transition-all"
                      >
                        Share on X
                      </button>
                    </div>
                  )}
                </div>
              ) : gameState.phase === "won" ? (
                <div className="text-center space-y-4 py-2">
                  <h3 className="text-white font-black text-xl tracking-wide">
                    {isDemo
                      ? "How do you wanna start the game?"
                      : `You Won ${gameState.actualPayout?.toFixed(8) || (gameState.potentialWin / 1e18).toFixed(8)} MNT!`}
                  </h3>
                  {isDemo ? (
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={login}
                        className="px-6 py-3 text-base bg-lime-400 text-black font-bold rounded-lg border-2 border-lime-400 hover:bg-lime-300 transition-all flex items-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        Sign In
                      </button>
                      <button
                        onClick={handlePlayAgain}
                        className="px-6 py-3 text-base bg-zinc-800 text-white font-bold rounded-lg border-2 border-zinc-700 hover:border-zinc-500 transition-all flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Play Demo
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={handlePlayAgain}
                        className="flex-1 py-3 text-base bg-lime-400 text-black font-bold rounded-lg border-2 border-black shadow-brutal-sm hover:bg-lime-300 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                      >
                        Play Again
                      </button>
                      <button
                        onClick={() =>
                          window.open(
                            `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                              `I just hit ${(isDemo ? gameState.multiplier : (gameState.multiplier / 1e18)).toFixed(2)}x in RugMania and cashed out 🔥 Think you can climb higher? ${
                                window.location.href
                              }`
                            )}`,
                            "_blank"
                          )
                        }
                        className="flex-1 py-3 text-base bg-black text-white font-bold rounded-lg border-2 border-zinc-700 hover:border-white transition-all"
                      >
                        Share on X
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* Leaderboard - Right */}
          <div className="lg:col-span-4 h-full">
            <Leaderboard />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
