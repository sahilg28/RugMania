import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAddress } from "viem";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/apiResponse";

const AddressQuerySchema = z.object({
  address: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = AddressQuerySchema.safeParse({ address: searchParams.get("address") });
  if (!parsed.success) {
    return jsonError({ status: 400, message: "Address required" });
  }

  const address = parsed.data.address.toLowerCase();

  if (!isAddress(address)) {
    return jsonError({ status: 400, message: "Invalid address" });
  }

  try {
    const db = await getDb();
    const gamesCollection = db.collection("games");

    // Fetch games for this player, sorted by newest first
    const games = await gamesCollection
      .find({ player: address })
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

    return jsonOk({ games: formattedGames });
  } catch (error) {
    console.error("Failed to fetch game history:", error);
    return jsonError({ status: 500, message: "Failed to fetch game history", data: { games: [] } });
  }
}
