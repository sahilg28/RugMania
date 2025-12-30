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

    const normalizedAddress = address;

    // Aggregate stats for this player
    const pipeline = [
      { $match: { player: normalizedAddress } },
      {
        $group: {
          _id: "$player",
          totalGames: { $sum: 1 },
          wins: { $sum: { $cond: ["$won", 1, 0] } },
          totalWagered: { $sum: "$betAmount" },
          totalPayout: { $sum: { $cond: ["$won", "$payout", 0] } },
          totalLost: { $sum: { $cond: ["$won", 0, "$betAmount"] } },
        },
      },
    ];

    const results = await gamesCollection.aggregate(pipeline).toArray();

    if (results.length === 0) {
      return jsonOk({
        totalGames: 0,
        wins: 0,
        totalWagered: "0",
        netProfitLoss: "0",
      });
    }

    const stats = results[0];
    // Net profit = total payouts - total wagered on losses
    const netProfitLoss = (stats.totalPayout || 0) - (stats.totalLost || 0);

    return jsonOk({
      totalGames: stats.totalGames || 0,
      wins: stats.wins || 0,
      totalWagered: BigInt(Math.floor((stats.totalWagered || 0) * 1e18)).toString(),
      netProfitLoss: BigInt(Math.floor(netProfitLoss * 1e18)).toString(),
    });
  } catch (error) {
    console.error("Failed to fetch player stats:", error);
    return jsonError({
      status: 500,
      message: "Failed to fetch player stats",
      data: { totalGames: 0, wins: 0, totalWagered: "0", netProfitLoss: "0" },
    });
  }
}
