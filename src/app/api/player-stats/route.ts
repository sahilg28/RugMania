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

    const normalizedAddress = address.toLowerCase();

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
      return NextResponse.json({
        totalGames: 0,
        wins: 0,
        totalWagered: "0",
        netProfitLoss: "0",
      });
    }

    const stats = results[0];
    // Net profit = total payouts - total wagered on losses
    const netProfitLoss = (stats.totalPayout || 0) - (stats.totalLost || 0);

    return NextResponse.json({
      totalGames: stats.totalGames || 0,
      wins: stats.wins || 0,
      totalWagered: BigInt(Math.floor((stats.totalWagered || 0) * 1e18)).toString(),
      netProfitLoss: BigInt(Math.floor(netProfitLoss * 1e18)).toString(),
    });
  } catch (error) {
    console.error("Failed to fetch player stats:", error);
    return NextResponse.json({
      totalGames: 0,
      wins: 0,
      totalWagered: "0",
      netProfitLoss: "0",
    });
  }
}
