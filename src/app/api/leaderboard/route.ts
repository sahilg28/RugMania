import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

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
    const period = searchParams.get("period") || "alltime";
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

    return NextResponse.json({ players });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json({ players: [], error: "Failed to fetch" }, { status: 500 });
  }
}

// POST endpoint to record a game result
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { player, won, betAmount, payout, txHash } = body;

    if (!player || typeof won !== "boolean") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const db = await getDb();
    const gamesCollection = db.collection("games");

    // Check if this game already exists (prevent duplicates)
    if (txHash) {
      const existing = await gamesCollection.findOne({ txHash });
      if (existing) {
        return NextResponse.json({ success: true, duplicate: true });
      }
    }

    await gamesCollection.insertOne({
      player: player.toLowerCase(),
      won,
      betAmount: betAmount || 0,
      payout: payout || 0,
      txHash: txHash || null,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to record game:", error);
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }
}
