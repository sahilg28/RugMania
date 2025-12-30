import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAddress, parseEventLogs } from "viem";
import ABI from "@/lib/contract/abi.json";
import { z } from "zod";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { publicClient } from "@/lib/viem";
import { jsonError, jsonOk } from "@/lib/apiResponse";

const DEBUG_LOGS = process.env.DEBUG_LOGS === "1";

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

const CONTRACT_ADDRESS = "0x3B909Be5ABD7861028Bf622b04cF205391D52125";

const LeaderboardPeriodSchema = z.enum(["weekly", "alltime"]);

const LeaderboardPostSchema = z.object({
  player: z.string().min(1),
  won: z.boolean(),
  betAmount: z.number().finite().nonnegative().max(1_000).optional(),
  payout: z.number().finite().nonnegative().max(100_000).optional(),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

type VerifiedLeaderboardTx =
  | { ok: true; payoutWei?: bigint }
  | { ok: false; error: string };

async function verifyLeaderboardTx(params: {
  player: string;
  won: boolean;
  txHash: string;
}): Promise<VerifiedLeaderboardTx> {
  const player = params.player.toLowerCase();
  const txHash = params.txHash;

  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return { ok: false, error: "Invalid txHash" };
  }

  let tx: any;
  let receipt: any;
  try {
    tx = await publicClient.getTransaction({ hash: txHash as `0x${string}` });
    receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch {
    return { ok: false, error: "Transaction not found" };
  }

  const txFrom = (tx?.from as string | undefined)?.toLowerCase();
  const txTo = (tx?.to as string | undefined)?.toLowerCase();

  if (!txFrom || txFrom !== player) {
    return { ok: false, error: "Transaction sender mismatch" };
  }

  if (!txTo || txTo !== CONTRACT_ADDRESS.toLowerCase()) {
    return { ok: false, error: "Transaction target mismatch" };
  }

  if (receipt?.status !== "success") {
    return { ok: false, error: "Transaction reverted" };
  }

  const expectedEventName = params.won ? "CashOut" : "Rugged";
  let parsed: any[] = [];
  try {
    parsed = parseEventLogs({
      abi: ABI as any,
      logs: receipt.logs,
      eventName: expectedEventName as any,
    });
  } catch {
    parsed = [];
  }

  const matching = parsed.find((e) => {
    const eventPlayer = (e?.args?.player as string | undefined)?.toLowerCase();
    return eventPlayer === player;
  });

  if (!matching) {
    return { ok: false, error: "Expected event not found" };
  }

  if (params.won) {
    const payoutWei = matching?.args?.payout as bigint | undefined;
    if (typeof payoutWei !== "bigint") {
      return { ok: false, error: "Invalid payout in event" };
    }
    return { ok: true, payoutWei };
  }

  return { ok: true };
}

interface PlayerStats {
  address: string;
  displayName: string;
  wins: number;
  games: number;
  rank: number;
}

// Get Monday of current week (UTC)
function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
  return monday;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = LeaderboardPeriodSchema.catch("alltime").parse(searchParams.get("period"));
    const isWeekly = period === "weekly";

    const db = await getDb();
    const gamesCollection = db.collection("games");
    const usersCollection = db.collection("users");

    // Build match filter
    const matchFilter: any = {};
    if (isWeekly) {
      matchFilter.timestamp = { $gte: getWeekStartDate() };
    }

    // Aggregate player stats
    const pipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: "$player",
          wins: { $sum: { $cond: ["$won", 1, 0] } },
          games: { $sum: 1 },
        },
      },
      { $sort: { wins: -1, games: -1 } },
      { $limit: 50 },
    ];

    const results = await gamesCollection.aggregate(pipeline).toArray();

    // Get all player addresses
    const addresses = results.map((r) => r._id);

    // Fetch usernames for all players
    const users = await usersCollection
      .find({ address: { $in: addresses } })
      .toArray();

    // Create address -> username map
    const usernameMap = new Map<string, string>();
    users.forEach((u) => {
      usernameMap.set(u.address, u.username);
    });

    const players: PlayerStats[] = results.map((doc: any, index: number) => {
      const address = doc._id;
      // Use custom username if exists, otherwise truncated address
      const displayName = usernameMap.get(address) || `${address.slice(0, 6)}...${address.slice(-4)}`;
      
      return {
        address,
        displayName,
        wins: doc.wins,
        games: doc.games,
        rank: index + 1,
      };
    });

    return jsonOk({ players });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return jsonError({ status: 500, message: "Failed to fetch", data: { players: [] } });
  }
}

// POST endpoint to record a game result
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    const body = await request.json();
    const parsed = LeaderboardPostSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError({ status: 400, message: "Invalid data" });
    }

    const { player, won, betAmount, payout, txHash } = parsed.data;

    // Rate limits: keep conservative to avoid breaking normal gameplay.
    // - Per-IP: protects DB/RPC from brute spam
    // - Per-player: prevents one address from flooding
    const ipLimit = rateLimit(`leaderboard:ip:${ip}`, { windowMs: 60_000, max: 30 });
    if (!ipLimit.ok) {
      return jsonError({
        status: 429,
        message: "Too many requests",
        headers: { "Retry-After": String(Math.ceil(ipLimit.resetMs / 1000)) },
      });
    }
    const playerLimit = rateLimit(`leaderboard:player:${player.toLowerCase()}`, { windowMs: 60_000, max: 10 });
    if (!playerLimit.ok) {
      return jsonError({
        status: 429,
        message: "Too many requests",
        headers: { "Retry-After": String(Math.ceil(playerLimit.resetMs / 1000)) },
      });
    }

    if (!isAddress(player)) {
      return jsonError({ status: 400, message: "Invalid player address" });
    }

    const verification = await verifyLeaderboardTx({ player, won, txHash });
    if (!verification.ok) {
      logDebug("Leaderboard submission rejected", {
        txHash: shortHash(txHash),
        reason: verification.error,
      });
      return jsonError({ status: 401, message: "Unauthorized" });
    }

    const db = await getDb();
    const gamesCollection = db.collection("games");

    // Check if this game already exists (prevent duplicates)
    if (txHash) {
      const existing = await gamesCollection.findOne({ txHash });
      if (existing) {
        return jsonOk({ success: true, duplicate: true });
      }
    }

    const betAmountNumber = typeof betAmount === "number" ? betAmount : 0;
    const payoutNumber = typeof payout === "number" ? payout : 0;
    const payoutWei = won ? (verification.payoutWei ?? BigInt(0)) : BigInt(0);

    await gamesCollection.insertOne({
      player: player.toLowerCase(),
      won,
      betAmount: betAmountNumber || 0,
      // For wins, prefer on-chain payout (converted to a number in MNT units for backward compatibility).
      payout: won ? Number(payoutWei) / 1e18 : payoutNumber || 0,
      txHash: txHash,
      timestamp: new Date(),
    });

    logDebug("Leaderboard submission accepted", {
      txHash: shortHash(txHash),
      event: won ? "CashOut" : "Rugged",
    });

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Failed to record game:", error);
    return jsonError({ status: 500, message: "Failed to record" });
  }
}
