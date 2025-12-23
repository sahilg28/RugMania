"use client";

import React from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWatchContractEvent } from "wagmi";
import { useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { CONTRACT_ADDRESSES } from "@/config/chains";
import ABI from "@/lib/contract/abi.json";
import { formatEther } from "viem";

export function useRugMania() {
  const { address, connector } = useAccount();
  // const connection = useConnection();
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const { writeContractAsync } = useWriteContract();
  const RUG_MANIA_ADDRESS = CONTRACT_ADDRESSES.doorRunner;

  // Get internal Privy embedded wallet address
  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
  const embeddedAddress = embeddedWallet?.address;

  // Set embedded wallet as active if not already active
  React.useEffect(() => {
    if (embeddedWallet && address !== embeddedAddress) {
      setActiveWallet(embeddedWallet);
    }
  }, [embeddedWallet, address, embeddedAddress, setActiveWallet]);

  // Use embedded address for contract interactions
  const contractAddress = embeddedAddress || address || "0x0000000000000000000000000000000000000000";

  // Debug: Log what connector we're getting
  // console.log("useRugMania - connector:", connector);
  // console.log("useRugMania - connector methods:", connector ? Object.getOwnPropertyNames(connector) : 'null');
  // // console.log("useRugMania - connection:", connection);
  // console.log("useRugMania - embedded wallet address:", embeddedAddress);
  // console.log("useRugMania - contract address:", contractAddress);

  const { data: reads } = useReadContracts({
    contracts: [
      {
        address: RUG_MANIA_ADDRESS,
        abi: ABI,
        functionName: "getGame",
        args: [contractAddress ?? "0x0000000000000000000000000000000000000000"],
      },
      {
        address: RUG_MANIA_ADDRESS,
        abi: ABI,
        functionName: "getCurrentPayout",
        args: [contractAddress ?? "0x0000000000000000000000000000000000000000"],
      },
      {
        address: RUG_MANIA_ADDRESS,
        abi: ABI,
        functionName: "getMaxBet",
      },
      {
        address: RUG_MANIA_ADDRESS,
        abi: ABI,
        functionName: "MAX_LEVELS",
      },
    ],
    query: { enabled: !!contractAddress },
  });


  const game = reads?.[0]?.result as any | undefined;
  const currentPayout = reads?.[1]?.result as bigint | undefined;
  const maxBet = reads?.[2]?.result as bigint | undefined;
  const maxLevels = reads?.[3]?.result as bigint | undefined;

  // Write helpers – all same ABI/address
  async function placeBet(
    doors: number,
    clientSeed: `0x${string}`,
    serverSeedHash: `0x${string}`,
    valueWei: bigint
  ) {
    try {
      if (!contractAddress) {
        throw new Error("Please connect your wallet first");
      }
      
      if (!connector) {
        throw new Error("Wallet connector not available. Please make sure your wallet is properly connected.");
      }
      
      console.log("Attempting placeBet with connector:", connector);
      console.log("Connector has getChainId:", typeof connector.getChainId === 'function');
      console.log("Using embedded wallet address:", contractAddress);
      console.log("Bet parameters:", {
        doors,
        clientSeed,
        serverSeedHash,
        valueWei: valueWei.toString(),
        valueEth: parseFloat(formatEther(valueWei)).toFixed(6)
      });
      console.log("Current maxBet:", maxBet ? parseFloat(formatEther(maxBet)).toFixed(6) : 'unknown');
      console.log("Current game state:", game);
      
      // Validate bet amount against maxBet
      if (maxBet && valueWei > maxBet) {
        throw new Error(`Bet amount ${parseFloat(formatEther(valueWei)).toFixed(6)} MNT exceeds maximum bet ${parseFloat(formatEther(maxBet)).toFixed(6)} MNT`);
      }
      

      return await writeContractAsync({
        address: RUG_MANIA_ADDRESS,
        abi: ABI,
        functionName: "placeBet",
        args: [doors, clientSeed, serverSeedHash],
        value: valueWei,
      });
    } catch (error: any) {
      console.log(typeof error);
      console.error("Error in placeBet:", error);
      
      // Handle specific contract errors
      if (error.message?.includes('HouseRiskTooHigh')) {
        const match = error.message.match(/HouseRiskTooHigh\(uint256 maxPayout, uint256 availableBankroll\)\s*\((\d+),\s*(\d+)\)/);
        if (match) {
          const maxPayout = parseFloat(formatEther(BigInt(match[1]))).toFixed(4);
          const availableBankroll = parseFloat(formatEther(BigInt(match[2]))).toFixed(4);
          throw new Error(`House risk too high. Potential payout ${maxPayout} MNT exceeds available bankroll ${availableBankroll} MNT. Please try a lower bet amount, decrease the difficulty, or wait for more house liquidity.`);
        }
      }
      
      if (error.message?.includes('BetBelowMinimum')) {
        throw new Error("Bet amount is below the minimum required (0.1 MNT).");
      }
      
      if (error.message?.includes('BetTooHigh')) {
        throw new Error("Bet amount exceeds the maximum allowed.");
      }
      
      if (error.message?.includes('GameAlreadyActive')) {
        throw new Error("You already have an active game. Please cash out or complete your current game before starting a new one.");
      }
      
      if (error.message?.includes('NoHouseLiquidity')) {
        throw new Error("The house does not have enough liquidity to accept your bet. Please try again later.");
      }
      
      throw error;
    }
  }

  async function selectDoor(
    doorIndex: number,
    serverSeed: `0x${string}`
  ) {
    return writeContractAsync({
      address: RUG_MANIA_ADDRESS,
      abi: ABI,
      functionName: "selectDoor",
      args: [doorIndex, serverSeed],
    });
  }

  async function cashOut() {
    return writeContractAsync({
      address: RUG_MANIA_ADDRESS,
      abi: ABI,
      functionName: "cashOut",
      args: [],
    });
  }

  return {
    // reads
    game,
    currentPayout,
    maxBet,
    maxLevels,
    contractAddress,
    // writes
    placeBet,
    selectDoor,
    cashOut,
  };

}