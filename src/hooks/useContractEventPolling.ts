"use client";

import { useEffect, useRef } from "react";
import { createPublicClient, http, fallback, keccak256, toHex } from "viem";
import { mantleSepolia } from "@/config/chains";
import ABI from "@/lib/contract/abi.json";

// Create a public client for event polling
const publicClient = createPublicClient({
  chain: mantleSepolia,
  transport: fallback([
    http('https://rpc.sepolia.mantle.xyz', { retryCount: 3, retryDelay: 1000, timeout: 30000 }),
    http('https://mantle-sepolia.blockpi.network/v1/rpc/public', { retryCount: 1, retryDelay: 5000, timeout: 10000 }),
    http('https://rpc.ankr.com/mantle_sepolia', { retryCount: 1, retryDelay: 5000, timeout: 10000 }),
  ]),
});

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
  pollingInterval = 3000,
}: UseContractEventPollingProps) {
  const lastBlockNumber = useRef<bigint | null>(null);
  const isPolling = useRef(false);
  const processedEvents = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !address) return;

    const pollEvents = async () => {
      if (isPolling.current) return;
      isPolling.current = true;

      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = lastBlockNumber.current || currentBlock - BigInt(1);
        
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
          const newLogs = logs.filter(log => {
            const eventId = `${log.transactionHash}-${log.logIndex}`;
            if (processedEvents.current.has(eventId)) return false;
            processedEvents.current.add(eventId);
            return true;
          });
          if (newLogs.length > 0) onLogs(newLogs);
        }
        lastBlockNumber.current = currentBlock;
      } catch (error) {
        console.error(`Error polling ${eventName} events:`, error);
        
        // Fallback to simpler getLogs
        try {
          const currentBlock = await publicClient.getBlockNumber();
          const fromBlock = lastBlockNumber.current || currentBlock - BigInt(1);
          const logs = await publicClient.getLogs({ address, fromBlock, toBlock: currentBlock });

          const eventAbi = ABI.find((item: any) => item.type === 'event' && item.name === eventName);
          if (eventAbi && eventAbi.inputs) {
            const signatureString = `${eventName}(${eventAbi.inputs.map((input: any) => input.type).join(',')})`;
            // Convert string to hex bytes before hashing (keccak256 expects hex or Uint8Array)
            const eventSignature = keccak256(toHex(signatureString));
            const filteredLogs = logs.filter(log => log.topics[0] === eventSignature);
            
            const newLogs = filteredLogs.filter(log => {
              const eventId = `${log.transactionHash}-${log.logIndex}`;
              if (processedEvents.current.has(eventId)) return false;
              processedEvents.current.add(eventId);
              return true;
            });
            if (newLogs.length > 0) onLogs(newLogs);
          }
          lastBlockNumber.current = currentBlock;
        } catch (fallbackError) {
          console.error(`Error polling ${eventName} (fallback):`, fallbackError);
          onError?.(fallbackError as Error);
        }
      } finally {
        isPolling.current = false;
      }
    };

    pollEvents();
    const interval = setInterval(pollEvents, pollingInterval);
    return () => { clearInterval(interval); isPolling.current = false; };
  }, [address, eventName, args, enabled, onLogs, onError, pollingInterval]);
}

export { publicClient };
