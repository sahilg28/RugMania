import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { mantleSepolia } from "@/config/chains";

const CONTRACT_ADDRESS = "0x3B909Be5ABD7861028Bf622b04cF205391D52125" as const;

// Use only the primary RPC (ankr requires API key)
const publicClient = createPublicClient({
  chain: mantleSepolia,
  transport: http("https://rpc.sepolia.mantle.xyz", { retryCount: 3, timeout: 30000 }),
});

interface PlayerStats {
  address: string;
  displayName: string;
  wins: number;
  games: number;
  rank: number;
}

// Get Monday of current week (for weekly reset)
function getWeekStartTimestamp(): number {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setUTCDate(diff));
  monday.setUTCHours(0, 0, 0, 0);
  return Math.floor(monday.getTime() / 1000);
}

// Cache
let cachedAllTime: PlayerStats[] | null = null;
let cachedWeekly: PlayerStats[] | null = null;
let lastFetchTimeAllTime = 0;
let lastFetchTimeWeekly = 0;
let weeklyFromBlock: bigint | null = null;
const CACHE_DURATION = 60000; // 1 minute

// Find approximate block number for a timestamp
async function findBlockByTimestamp(targetTimestamp: number): Promise<bigint> {
  try {
    const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
    const latestNumber = latestBlock.number;
    const latestTimestamp = Number(latestBlock.timestamp);
    
    if (targetTimestamp >= latestTimestamp) {
      return latestNumber;
    }
    
    const secondsAgo = latestTimestamp - targetTimestamp;
    const estimatedBlock = latestNumber - BigInt(Math.floor(secondsAgo));
    
    return estimatedBlock > 0n ? estimatedBlock : 0n;
  } catch {
    return 0n;
  }
}

// Fetch logs in chunks to avoid RPC block range limits (max 10,000 blocks)
async function fetchLogsInChunks(
  event: any,
  fromBlock: bigint,
  toBlock: bigint,
  chunkSize: bigint = 9000n
) {
  const allLogs: any[] = []
  let currentFrom = fromBlock

  while (currentFrom < toBlock) {
    const currentTo = currentFrom + chunkSize > toBlock ? toBlock : currentFrom + chunkSize
    
    try {
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        event,
        fromBlock: currentFrom,
        toBlock: currentTo,
      })
      allLogs.push(...logs)
    } catch (error) {
      console.error(`Error fetching logs from ${currentFrom} to ${currentTo}:`, error)
    }
    
    currentFrom = currentTo + 1n
  }

  return allLogs
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "alltime";
    
    const now = Date.now();
    const isWeekly = period === "weekly";
    
    // Return cached data if fresh
    if (isWeekly && cachedWeekly && now - lastFetchTimeWeekly < CACHE_DURATION) {
      return NextResponse.json({ players: cachedWeekly, cached: true });
    }
    if (!isWeekly && cachedAllTime && now - lastFetchTimeAllTime < CACHE_DURATION) {
      return NextResponse.json({ players: cachedAllTime, cached: true });
    }

    // For weekly, find the approximate starting block
    let fromBlock = 0n;
    let toBlock: bigint;
    
    try {
      toBlock = await publicClient.getBlockNumber();
    } catch {
      toBlock = 0n;
    }
    
    if (isWeekly) {
      const weekStart = getWeekStartTimestamp();
      if (!weeklyFromBlock || now - lastFetchTimeWeekly > CACHE_DURATION * 5) {
        weeklyFromBlock = await findBlockByTimestamp(weekStart);
      }
      fromBlock = weeklyFromBlock;
    } else {
      // For all-time, only look back ~50,000 blocks to avoid timeout
      fromBlock = toBlock > 50000n ? toBlock - 50000n : 0n;
    }

    // Get CashOut events (wins) in chunks
    const cashOutLogs = await fetchLogsInChunks(
      parseAbiItem("event CashOut(address indexed player, uint256 payout)"),
      fromBlock,
      toBlock
    );

    // Get BetPlaced events (games) in chunks
    const betPlacedLogs = await fetchLogsInChunks(
      parseAbiItem("event BetPlaced(address indexed player, uint256 amount, uint8 diffculty)"),
      fromBlock,
      toBlock
    );

    // Build player stats
    const playerStats = new Map<string, { wins: number; games: number }>();

    // Count games (BetPlaced events)
    for (const log of betPlacedLogs) {
      const player = log.args.player?.toLowerCase();
      if (!player) continue;

      const stats = playerStats.get(player) || { wins: 0, games: 0 };
      stats.games++;
      playerStats.set(player, stats);
    }

    // Count wins (CashOut events)
    for (const log of cashOutLogs) {
      const player = log.args.player?.toLowerCase();
      if (!player) continue;

      const stats = playerStats.get(player) || { wins: 0, games: 0 };
      stats.wins++;
      playerStats.set(player, stats);
    }

    // Convert to array and sort by wins
    const leaderboard: PlayerStats[] = Array.from(playerStats.entries())
      .filter(([_, stats]) => stats.games > 0)
      .map(([address, stats]) => ({
        address,
        displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
        wins: stats.wins,
        games: stats.games,
        rank: 0,
      }))
      .sort((a, b) => b.wins - a.wins || b.games - a.games)
      .slice(0, 50)
      .map((player, index) => ({ ...player, rank: index + 1 }));

    // Update cache
    if (isWeekly) {
      cachedWeekly = leaderboard;
      lastFetchTimeWeekly = now;
    } else {
      cachedAllTime = leaderboard;
      lastFetchTimeAllTime = now;
    }

    return NextResponse.json({ players: leaderboard, cached: false });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    
    // Return cached if available (prefer alltime as it's more likely to exist)
    const cached = cachedAllTime || cachedWeekly;
    if (cached) {
      return NextResponse.json({ players: cached, cached: true, stale: true });
    }
    
    return NextResponse.json({ players: [], error: "Failed to fetch" }, { status: 500 });
  }
}
