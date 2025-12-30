"use client";

import { useEffect, useRef } from "react";
import { keccak256, toHex } from "viem";
import { publicClient } from "@/lib/viem";
import ABI from "@/lib/contract/abi.json";

// Shared rate limit state across all polling instances
// This prevents all instances from making requests when one gets rate limited
let globalRateLimitUntil: number | null = null;

interface UseContractEventPollingProps {
  address: `0x${string}`;
  eventName: string;
  args?: any;
  enabled?: boolean;
  onLogs: (logs: any[]) => void;
  onError?: (error: Error) => void;
  pollingInterval?: number;
}

export function useContractEventPolling({
  address,
  eventName,
  args,
  enabled,
  onLogs,
  onError,
  pollingInterval = 5000, // Increased from 3000ms to 5000ms to reduce RPC load
}: UseContractEventPollingProps) {
  const lastBlockNumber = useRef<bigint | null>(null);
  const isPolling = useRef(false);
  const processedEvents = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureCount = useRef(0);
  const rateLimitUntil = useRef<number | null>(null);
  const consecutiveRateLimits = useRef(0);

  useEffect(() => {
    if (!enabled || !address) return;

    const isRateLimited = () => {
      // Check both instance-specific and global rate limits
      const instanceLimited = rateLimitUntil.current !== null && Date.now() < rateLimitUntil.current;
      const globalLimited = globalRateLimitUntil !== null && Date.now() < globalRateLimitUntil;
      return instanceLimited || globalLimited;
    };

    const computeNextDelayMs = () => {
      // If rate limited (instance or global), wait until the rate limit expires plus buffer
      const instanceWait = rateLimitUntil.current !== null && Date.now() < rateLimitUntil.current 
        ? rateLimitUntil.current - Date.now() + 5000 
        : 0;
      const globalWait = globalRateLimitUntil !== null && Date.now() < globalRateLimitUntil
        ? globalRateLimitUntil - Date.now() + 5000
        : 0;
      const waitTime = Math.max(instanceWait, globalWait);
      
      if (waitTime > 0) {
        return Math.max(waitTime, 30_000); // Minimum 30s when rate limited
      }

      const maxDelayMs = 60_000;
      const exp = Math.min(failureCount.current, 5);
      const base = pollingInterval * Math.pow(2, exp);
      const delay = Math.min(base, maxDelayMs);
      // Add jitter (±10%) to avoid thundering herd.
      const jitter = delay * 0.1 * (Math.random() * 2 - 1);
      return Math.max(500, Math.floor(delay + jitter));
    };

    const scheduleNext = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(pollEvents, computeNextDelayMs());
    };

    const pollEvents = async () => {
      if (isPolling.current) return;
      
      // Check if we're rate limited
      if (isRateLimited()) {
        scheduleNext();
        return;
      }
      
      isPolling.current = true;

      try {
        const currentBlock = await publicClient.getBlockNumber();
        const lookback = BigInt(10);
        const baseFrom = lastBlockNumber.current ?? (currentBlock > lookback ? currentBlock - lookback : BigInt(0));
        const fromBlock = baseFrom > lookback ? baseFrom - lookback : BigInt(0);
        
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
          const newLogs = logs.filter((log: any) => {
            const eventId = `${log.transactionHash}-${log.logIndex}`;
            if (processedEvents.current.has(eventId)) return false;
            processedEvents.current.add(eventId);
            return true;
          });
          if (newLogs.length > 0) onLogs(newLogs);
        }

        // Prevent unbounded growth if the tab stays open for a long time.
        if (processedEvents.current.size > 5000) {
          processedEvents.current.clear();
        }

        lastBlockNumber.current = currentBlock;
        failureCount.current = 0;
        consecutiveRateLimits.current = 0;
      } catch (error: any) {
        // Check if this is a rate limit error (429)
        const isRateLimitError = 
          error?.status === 429 || 
          error?.statusCode === 429 ||
          error?.message?.includes('429') ||
          error?.message?.includes('Too Many Requests') ||
          error?.message?.includes('rate limit');

        if (isRateLimitError) {
          consecutiveRateLimits.current += 1;
          // Exponential backoff for rate limits: 30s, 60s, 120s, 240s, max 300s
          const rateLimitDuration = Math.min(30_000 * Math.pow(2, consecutiveRateLimits.current - 1), 300_000);
          const rateLimitExpiry = Date.now() + rateLimitDuration;
          
          // Set both instance and global rate limits
          rateLimitUntil.current = rateLimitExpiry;
          globalRateLimitUntil = rateLimitExpiry;
          
          console.warn(`Rate limited. Pausing all polling for ${Math.floor(rateLimitDuration / 1000)}s`);
          
          // Don't call onError for rate limits, just back off
          isPolling.current = false;
          scheduleNext();
          return;
        }

        console.error(`Error polling ${eventName} events:`, error);
        
        // Fallback to simpler getLogs
        try {
          const currentBlock = await publicClient.getBlockNumber();
          const lookback = BigInt(10);
          const baseFrom = lastBlockNumber.current ?? (currentBlock > lookback ? currentBlock - lookback : BigInt(0));
          const fromBlock = baseFrom > lookback ? baseFrom - lookback : BigInt(0);
          const logs = await publicClient.getLogs({ address, fromBlock, toBlock: currentBlock });

          const eventAbi = ABI.find((item: any) => item.type === 'event' && item.name === eventName);
          if (eventAbi && eventAbi.inputs) {
            const signatureString = `${eventName}(${eventAbi.inputs.map((input: any) => input.type).join(',')})`;
            // Convert string to hex bytes before hashing (keccak256 expects hex or Uint8Array)
            const eventSignature = keccak256(toHex(signatureString));
            const filteredLogs = logs.filter((log: any) => log.topics[0] === eventSignature);
            
            const newLogs = filteredLogs.filter((log: any) => {
              const eventId = `${log.transactionHash}-${log.logIndex}`;
              if (processedEvents.current.has(eventId)) return false;
              processedEvents.current.add(eventId);
              return true;
            });
            if (newLogs.length > 0) onLogs(newLogs);
          }
          lastBlockNumber.current = currentBlock;
          if (processedEvents.current.size > 5000) {
            processedEvents.current.clear();
          }
          failureCount.current = 0;
          consecutiveRateLimits.current = 0;
        } catch (fallbackError: any) {
          // Check if fallback also hit rate limit
          const isRateLimitError = 
            fallbackError?.status === 429 || 
            fallbackError?.statusCode === 429 ||
            fallbackError?.message?.includes('429') ||
            fallbackError?.message?.includes('Too Many Requests') ||
            fallbackError?.message?.includes('rate limit');

          if (isRateLimitError) {
            consecutiveRateLimits.current += 1;
            const rateLimitDuration = Math.min(30_000 * Math.pow(2, consecutiveRateLimits.current - 1), 300_000);
            const rateLimitExpiry = Date.now() + rateLimitDuration;
            
            // Set both instance and global rate limits
            rateLimitUntil.current = rateLimitExpiry;
            globalRateLimitUntil = rateLimitExpiry;
            
            console.warn(`Rate limited (fallback). Pausing all polling for ${Math.floor(rateLimitDuration / 1000)}s`);
            isPolling.current = false;
            scheduleNext();
            return;
          }

          console.error(`Error polling ${eventName} (fallback):`, fallbackError);
          failureCount.current += 1;
          onError?.(fallbackError as Error);
        }
      } finally {
        isPolling.current = false;
        scheduleNext();
      }
    };

    pollEvents();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      isPolling.current = false;
    };
  }, [address, eventName, args, enabled, onLogs, onError, pollingInterval]);
}

export { publicClient };
