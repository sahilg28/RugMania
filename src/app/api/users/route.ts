import { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAddress, recoverMessageAddress, toHex } from "viem";
import { z } from "zod";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { jsonError, jsonOk } from "@/lib/apiResponse";

function buildUsernameUpdateMessage(params: {
  address: string;
  username: string;
  timestamp: number;
}) {
  return `RugMania - Set Username\nAddress: ${params.address}\nUsername: ${params.username}\nTimestamp: ${params.timestamp}`;
}

const AddressQuerySchema = z.object({
  address: z.string().min(1),
});

const UsersPostSchema = z.object({
  address: z.string().min(1),
  username: z.string().min(1),
  signature: z.string().min(10),
  timestamp: z.number().finite(),
});

// GET user profile by address
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = AddressQuerySchema.safeParse({ address: searchParams.get("address") });
    if (!parsed.success) {
      return jsonError({ status: 400, message: "Address required" });
    }

    const address = parsed.data.address.toLowerCase();

    if (!isAddress(address)) {
      return jsonError({ status: 400, message: "Invalid address" });
    }

    if (!address) {
      return jsonError({ status: 400, message: "Address required" });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ address });

    if (!user) {
      // Return default profile
      return jsonOk({
        address,
        username: `${address.slice(0, 6)}...${address.slice(-4)}`,
      });
    }

    return jsonOk({
      address: user.address,
      username: user.username,
    });
  } catch (error) {
    console.error("Failed to get user:", error);
    return jsonError({ status: 500, message: "Failed to fetch" });
  }
}

// POST/PUT to save username
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    const body = await request.json();
    const parsed = UsersPostSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError({ status: 400, message: "Address and username required" });
    }

    const { address, username, signature, timestamp } = parsed.data;

    // Rate limit username updates to reduce brute force / spam.
    const ipLimit = rateLimit(`users:ip:${ip}`, { windowMs: 60_000, max: 30 });
    if (!ipLimit.ok) {
      return jsonError({
        status: 429,
        message: "Too many requests",
        headers: { "Retry-After": String(Math.ceil(ipLimit.resetMs / 1000)) },
      });
    }
    const addrLower = address.toLowerCase();
    const addrLimit = rateLimit(`users:address:${addrLower}`, { windowMs: 60_000, max: 10 });
    if (!addrLimit.ok) {
      return jsonError({
        status: 429,
        message: "Too many requests",
        headers: { "Retry-After": String(Math.ceil(addrLimit.resetMs / 1000)) },
      });
    }

    const normalizedAddress = addrLower;
    const trimmedUsername = username.trim();

    if (!isAddress(normalizedAddress)) {
      return jsonError({ status: 400, message: "Invalid address" });
    }

    if (typeof signature !== "string" || signature.length < 10) {
      return jsonError({ status: 401, message: "Unauthorized" });
    }

    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
      return jsonError({ status: 400, message: "Invalid timestamp" });
    }

    // Prevent easy replay by requiring a recent timestamp.
    const now = Date.now();
    const maxSkewMs = 5 * 60 * 1000;
    if (Math.abs(now - timestamp) > maxSkewMs) {
      return jsonError({ status: 401, message: "Unauthorized" });
    }

    // Allowlist: 3-20 chars, letters/numbers/underscore only
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      return jsonError({
        status: 400,
        message: "Username must be 3-20 characters and contain only letters, numbers, and _",
      });
    }

    const expectedMessage = buildUsernameUpdateMessage({
      address: normalizedAddress,
      username: trimmedUsername,
      timestamp,
    });

    let recovered: string;
    try {
      recovered = await recoverMessageAddress({
        message: { raw: toHex(expectedMessage) },
        signature: signature as `0x${string}`,
      });
    } catch {
      return jsonError({ status: 401, message: "Unauthorized" });
    }

    if (recovered.toLowerCase() !== normalizedAddress) {
      return jsonError({ status: 401, message: "Unauthorized" });
    }

    const usernameLower = trimmedUsername.toLowerCase();

    const db = await getDb();
    const usersCollection = db.collection("users");

    // Ensure indexes exist (idempotent). This is required to enforce integrity at the DB layer.
    await usersCollection.createIndex({ address: 1 }, { unique: true });
    await usersCollection.createIndex({ usernameLower: 1 }, { unique: true, sparse: true });

    // Check if username is taken by another user
    const existingUser = await usersCollection.findOne({
      usernameLower,
      address: { $ne: normalizedAddress },
    });

    if (existingUser) {
      return jsonError({ status: 409, message: "Username already taken" });
    }

    // Upsert user profile
    await usersCollection.updateOne(
      { address: normalizedAddress },
      {
        $set: {
          username: trimmedUsername,
          usernameLower,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          address: normalizedAddress,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return jsonOk({ success: true, username: trimmedUsername });
  } catch (error) {
    console.error("Failed to save user:", error);
    return jsonError({ status: 500, message: "Failed to save" });
  }
}
