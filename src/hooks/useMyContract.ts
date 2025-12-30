"use client";

import React from "react";
import { useAccount, useReadContracts } from "wagmi";
import { useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { CONTRACT_ADDRESSES } from "@/config/chains";
import ABI from "@/lib/contract/abi.json";
import { formatEther, encodeFunctionData, keccak256, toHex } from "viem";
import { publicClient } from "@/lib/viem";

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

const CONTRACT_ERRORS: Record<string, string> = {
  GameAlreadyActive: "You already have an active game. Cash out or finish it first.",
  HouseRiskTooHigh: "House cannot cover potential payout. Try a lower bet.",
  NoHouseLiquidity: "House has no funds. Please try again later.",
  BetBelowMinimum: "Minimum bet is 0.1 MNT.",
  BetTooHigh: "Bet exceeds maximum allowed.",
  InvalidDoors: "Invalid difficulty selected.",
  InvalidSeed: "Invalid seed provided.",
  NoActiveGame: "No active game found. Please place a bet first.",
  NothingToCashOut: "You need to win at least one level to cash out.",
  InsufficientHouseBalance: "House cannot pay your winnings right now.",
  InvalidServerSeed: "Server seed verification failed. Seeds don't match.",
  InvalidDoorIndex: "Invalid door selected.",
  MaxLevelReached: "You've reached the maximum level!",
  TranferFailed: "Transfer failed. Please try again.",
};

function decodeContractError(error: any): string {
  const msg = error?.message || error?.toString() || "";
  for (const [errorName, message] of Object.entries(CONTRACT_ERRORS)) {
    if (msg.includes(errorName)) return message;
  }
  if (msg.includes("insufficient funds")) return "Insufficient wallet balance for this bet.";
  if (msg.includes("user rejected") || msg.includes("User rejected")) return "Transaction was cancelled.";
  if (msg.includes("nonce")) return "Transaction conflict. Please try again.";
  if (msg.includes("execution reverted")) return "Transaction rejected by contract. Check your bet amount.";
  return "Transaction failed. Please try again.";
}

export function useRugMania() {
  const { address } = useAccount();
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const RUG_MANIA_ADDRESS = CONTRACT_ADDRESSES.doorRunner;

  const embeddedWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
  const embeddedAddress = embeddedWallet?.address as `0x${string}` | undefined;

  React.useEffect(() => {
    if (embeddedWallet && address !== embeddedAddress) {
      // Only set active wallet if it's not already active to avoid unnecessary RPC calls
      const setWallet = async () => {
        try {
          await setActiveWallet(embeddedWallet);
        } catch (error: any) {
          // Ignore errors if wallet is already active or connection issues
          if (!error?.message?.includes('already active') && !error?.message?.includes('406')) {
            console.warn('Failed to set active wallet:', error);
          }
        }
      };
      setWallet();
    }
  }, [embeddedWallet, address, embeddedAddress, setActiveWallet]);

  const contractAddress = embeddedAddress || address || "0x0000000000000000000000000000000000000000";

  const { data: reads, refetch: refetchContractState } = useReadContracts({
    contracts: [
      { address: RUG_MANIA_ADDRESS, abi: ABI, functionName: "getGame", args: [contractAddress] },
      { address: RUG_MANIA_ADDRESS, abi: ABI, functionName: "getCurrentPayout", args: [contractAddress] },
      { address: RUG_MANIA_ADDRESS, abi: ABI, functionName: "getMaxBet" },
      { address: RUG_MANIA_ADDRESS, abi: ABI, functionName: "MAX_LEVELS" },
      { address: RUG_MANIA_ADDRESS, abi: ABI, functionName: "houseBalance" },
      { address: RUG_MANIA_ADDRESS, abi: ABI, functionName: "MIN_BET" },
      { address: RUG_MANIA_ADDRESS, abi: ABI, functionName: "HOUSE_EDGE_PERCENT" },
    ],
    query: { enabled: !!contractAddress && contractAddress !== "0x0000000000000000000000000000000000000000" },
  });

  const game = reads?.[0]?.result as any | undefined;
  const currentPayout = reads?.[1]?.result as bigint | undefined;
  const maxBet = reads?.[2]?.result as bigint | undefined;
  const maxLevels = reads?.[3]?.result as bigint | undefined;
  const houseBalance = reads?.[4]?.result as bigint | undefined;
  const minBet = reads?.[5]?.result as bigint | undefined;
  const houseEdgePercent = reads?.[6]?.result as bigint | undefined;
  const hasActiveGame = game?.isActive === true;

  // Generate deterministic seeds from wallet signature
  async function generateDeterministicSeeds(gameNonce: number): Promise<{ 
    serverSeed: `0x${string}`, 
    clientSeed: `0x${string}`, 
    serverSeedHash: `0x${string}` 
  }> {
    if (!embeddedWallet) throw new Error("Wallet not connected");
    const provider = await embeddedWallet.getEthereumProvider();
    
    // Generate unique seeds using different messages
    const serverMessage = `RugMania Server Seed - Contract: ${RUG_MANIA_ADDRESS} - Nonce: ${gameNonce} - Type: server`;
    const clientMessage = `RugMania Client Seed - Contract: ${RUG_MANIA_ADDRESS} - Nonce: ${gameNonce} - Type: client`;
    
    // Sign for server seed
    const serverSignature = await provider.request({
      method: 'personal_sign',
      params: [toHex(serverMessage), embeddedAddress],
    }) as string;
    
    // Sign for client seed (different message = different signature)
    const clientSignature = await provider.request({
      method: 'personal_sign',
      params: [toHex(clientMessage), embeddedAddress],
    }) as string;
    
    const serverSeed = keccak256(serverSignature as `0x${string}`);
    const clientSeed = keccak256(clientSignature as `0x${string}`);
    const serverSeedHash = keccak256(serverSeed);
    
    return { serverSeed, clientSeed, serverSeedHash };
  }

  // Recover seeds for an existing game using the stored serverSeedHash
  async function recoverSeeds(storedServerSeedHash: string, maxAttempts: number = 100): Promise<{ 
    serverSeed: `0x${string}`, 
    clientSeed: `0x${string}` 
  } | null> {
    if (!embeddedWallet) throw new Error("Wallet not connected");
    const provider = await embeddedWallet.getEthereumProvider();
    
    for (let nonce = 0; nonce < maxAttempts; nonce++) {
      const serverMessage = `RugMania Server Seed - Contract: ${RUG_MANIA_ADDRESS} - Nonce: ${nonce} - Type: server`;
      const clientMessage = `RugMania Client Seed - Contract: ${RUG_MANIA_ADDRESS} - Nonce: ${nonce} - Type: client`;
      
      try {
        const serverSignature = await provider.request({
          method: 'personal_sign',
          params: [toHex(serverMessage), embeddedAddress],
        }) as string;
        
        const serverSeed = keccak256(serverSignature as `0x${string}`);
        const serverSeedHash = keccak256(serverSeed);
        
        if (serverSeedHash === storedServerSeedHash) {
          const clientSignature = await provider.request({
            method: 'personal_sign',
            params: [toHex(clientMessage), embeddedAddress],
          }) as string;
          const clientSeed = keccak256(clientSignature as `0x${string}`);
          return { serverSeed, clientSeed };
        }
      } catch (e) {
        console.error("Error recovering seed at nonce", nonce, e);
      }
    }
    return null;
  }

  function getNextGameNonce(): number {
    const key = `rugmania_nonce_${embeddedAddress}`;
    return parseInt(localStorage.getItem(key) || '0', 10);
  }

  function incrementGameNonce(): void {
    const key = `rugmania_nonce_${embeddedAddress}`;
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, (current + 1).toString());
  }

  async function sendTransaction(data: `0x${string}`, value?: bigint): Promise<string> {
    if (!embeddedWallet) throw new Error("Wallet not connected. Please connect first.");
    try {
      const provider = await embeddedWallet.getEthereumProvider();
      
      // Switch to correct chain
      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x138b' }] });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x138b',
              chainName: 'Mantle Sepolia Testnet',
              nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
              rpcUrls: ['https://rpc.sepolia.mantle.xyz'],
              blockExplorerUrls: ['https://sepolia.mantlescan.xyz'],
            }],
          });
        } else {
          throw switchError;
        }
      }
      
      // Send transaction
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: embeddedAddress,
          to: RUG_MANIA_ADDRESS,
          data: data,
          value: value ? `0x${value.toString(16)}` : '0x0',
        }],
      });

      logDebug("Transaction sent", { txHash: shortHash(String(txHash)) });
      
      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash as `0x${string}`,
        timeout: 60_000, // 60 second timeout
      });

      logDebug("Transaction confirmed", { status: receipt.status });
      
      if (receipt.status === 'reverted') {
        throw new Error("Transaction reverted on-chain. Check contract conditions.");
      }
      
      return txHash as string;
    } catch (error: any) {
      console.error("Transaction error:", error);
      throw new Error(decodeContractError(error));
    }
  }

  function validateBet(valueWei: bigint, doors: number): { valid: boolean; error?: string } {
    if (!embeddedAddress) return { valid: false, error: "Please connect your wallet first." };
    if (hasActiveGame) return { valid: false, error: "You already have an active game. Cash out or finish it first." };
    if (minBet && valueWei < minBet) return { valid: false, error: `Minimum bet is ${formatEther(minBet)} MNT.` };
    if (maxBet && valueWei > maxBet) return { valid: false, error: `Maximum bet is ${formatEther(maxBet)} MNT.` };
    if (!houseBalance || houseBalance === BigInt(0)) return { valid: false, error: "House has no funds. Please try again later." };
    if (![3, 4, 5].includes(doors)) return { valid: false, error: "Invalid difficulty." };
    return { valid: true };
  }

  async function placeBet(doors: number, clientSeed: `0x${string}`, serverSeedHash: `0x${string}`, valueWei: bigint) {
    const validation = validateBet(valueWei, doors);
    if (!validation.valid) throw new Error(validation.error);

    logDebug("Contract placeBet", { doors, value: formatEther(valueWei) });
    
    const data = encodeFunctionData({ abi: ABI, functionName: "placeBet", args: [doors, clientSeed, serverSeedHash] });
    const txHash = await sendTransaction(data, valueWei);
    await refetchContractState();
    return txHash;
  }

  async function selectDoor(doorIndex: number, serverSeed: `0x${string}`) {
    // Verify game is active before attempting
    if (!hasActiveGame) {
      throw new Error("No active game. Please place a bet first.");
    }

    logDebug("Contract selectDoor", { doorIndex });
    
    // Verify serverSeed format
    if (!serverSeed.startsWith('0x') || serverSeed.length !== 66) {
      throw new Error(`Invalid serverSeed format: ${serverSeed.substring(0, 20)}... (length: ${serverSeed.length})`);
    }

    const data = encodeFunctionData({ abi: ABI, functionName: "selectDoor", args: [doorIndex, serverSeed] });
    
    const txHash = await sendTransaction(data);
    await refetchContractState();
    return txHash;
  }

  async function cashOut() {
    if (!hasActiveGame) throw new Error("No active game to cash out.");
    const data = encodeFunctionData({ abi: ABI, functionName: "cashOut", args: [] });
    const txHash = await sendTransaction(data);
    setTimeout(() => refetchContractState(), 2000);
    return txHash;
  }

  return {
    game, currentPayout, maxBet, maxLevels, houseBalance, minBet, houseEdgePercent,
    hasActiveGame, contractAddress: embeddedAddress, isWalletConnected: !!embeddedWallet,
    placeBet, selectDoor, cashOut, refetchContractState, validateBet,
    generateDeterministicSeeds, recoverSeeds, getNextGameNonce, incrementGameNonce,
  };
}
