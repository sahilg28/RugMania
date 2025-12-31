import { jsonError, jsonOk } from "@/lib/apiResponse";
import { getDb } from "@/lib/mongodb";
import { NextRequest } from "next/server";
import { z } from "zod";

const GameStatePostSchema = z.object({
  playerAddress: z.string().min(1),
  serverSeed: z.string().min(1),
  serverSeedHash: z.string().min(1),
  betAmount: z.union([z.number().finite(), z.string()]), // Accept both number and string
  difficulty: z.number().finite(),
  expiresAt: z.date().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GameStatePostSchema.safeParse(body);
    
    if (!parsed.success) {
      return jsonError({ status: 400, message: "Invalid game state data" });
    }

    const { playerAddress, ...gameData } = parsed.data;

    const db = await getDb();
    // Upsert game session - replace any existing session for this player
    await db.collection("gamesessions").replaceOne(
      { playerAddress: playerAddress.toLowerCase() },
      {
        playerAddress: playerAddress.toLowerCase(),
        ...gameData,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
      { upsert: true }
    );

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Failed to save game state:", error);
    return jsonError({ status: 500, message: "Failed to save game state" });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    
    if (!address) {
      return jsonError({ status: 400, message: "Address required" });
    }
    
    const db = await getDb();
    const gameSession = await db.collection("gamesessions").findOne({ 
      playerAddress: address.toLowerCase() 
    });

    console.log("game session", gameSession);
    
    if (!gameSession || gameSession.status !== "pending") {
      return jsonError({ status: 404, message: "No active game session found" });
    }
    
    return jsonOk({
      serverSeed: gameSession.serverSeed,
    clientSeed: null,
    serverSeedHash: gameSession.serverSeedHash,
    });
  } catch (error) {
    console.error("Failed to get game state:", error);
    return jsonError({ status: 500, message: "Failed to fetch game state" });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    
    if (!address) {
      return jsonError({ status: 400, message: "Address required" });
    }

    const db = await getDb();
    const result = await db.collection("gamesessions").deleteOne({ 
      playerAddress: address.toLowerCase() 
    });

    return jsonOk({ success: true, deleted: result.deletedCount });
  } catch (error) {
    console.error("Failed to delete game session:", error);
    return jsonError({ status: 500, message: "Failed to delete game session" });
  }
}