import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const gamesCollection = db.collection("games");

    // Fetch games for this player, sorted by newest first
    const games = await gamesCollection
      .find({ player: address.toLowerCase() })
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    // Format for frontend
    const formattedGames = games.map((game, index) => ({
      gameId: game.txHash ? `#${game.txHash.slice(0, 8)}` : `#${index + 1}`,
      status: game.won ? "Win" : "Loss",
      wagered: BigInt(Math.floor((game.betAmount || 0) * 1e18)).toString(),
      winnings: game.won
        ? BigInt(Math.floor((game.payout || 0) * 1e18)).toString()
        : `-${BigInt(Math.floor((game.betAmount || 0) * 1e18)).toString()}`,
      timestamp: game.timestamp,
    }));

    return NextResponse.json({ games: formattedGames });
  } catch (error) {
    console.error("Failed to fetch game history:", error);
    return NextResponse.json({ games: [] });
  }
}
