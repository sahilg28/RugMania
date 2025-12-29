import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// GET user profile by address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address")?.toLowerCase();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ address });

    if (!user) {
      // Return default profile
      return NextResponse.json({
        address,
        username: `${address.slice(0, 6)}...${address.slice(-4)}`,
      });
    }

    return NextResponse.json({
      address: user.address,
      username: user.username,
    });
  } catch (error) {
    console.error("Failed to get user:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST/PUT to save username
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, username } = body;

    if (!address || !username) {
      return NextResponse.json({ error: "Address and username required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 1 || trimmedUsername.length > 20) {
      return NextResponse.json({ error: "Username must be 1-20 characters" }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection("users");

    // Check if username is taken by another user
    const existingUser = await usersCollection.findOne({
      username: { $regex: new RegExp(`^${trimmedUsername}$`, "i") },
      address: { $ne: normalizedAddress },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    // Upsert user profile
    await usersCollection.updateOne(
      { address: normalizedAddress },
      {
        $set: {
          username: trimmedUsername,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          address: normalizedAddress,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, username: trimmedUsername });
  } catch (error) {
    console.error("Failed to save user:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
