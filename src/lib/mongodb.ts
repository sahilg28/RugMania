import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _dbSetupPromise: Promise<void> | undefined;
}

async function ensureCollection(db: Db, name: string, options?: Record<string, unknown>) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length > 0) return;
  await db.createCollection(name, options);
}

async function ensureDbSetup(db: Db): Promise<void> {
  // Collections + validators (warn-only to avoid breaking existing docs)
  await ensureCollection(db, "users", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["address", "username"],
        properties: {
          address: { bsonType: "string" },
          username: { bsonType: "string" },
          usernameLower: { bsonType: "string" },
          createdAt: { bsonType: "date" },
          updatedAt: { bsonType: "date" },
        },
      },
    },
    validationAction: "warn",
    validationLevel: "moderate",
  });

  await ensureCollection(db, "games", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["player", "won", "timestamp"],
        properties: {
          player: { bsonType: "string" },
          won: { bsonType: "bool" },
          betAmount: { bsonType: "number" },
          payout: { bsonType: "number" },
          txHash: { bsonType: ["string", "null"] },
          timestamp: { bsonType: "date" },
        },
      },
    },
    validationAction: "warn",
    validationLevel: "moderate",
  });

  // Indexes
  const users = db.collection("users");
  await users.createIndex({ address: 1 }, { unique: true });
  await users.createIndex({ usernameLower: 1 }, { unique: true, sparse: true });

  const games = db.collection("games");
  // Unique txHash, but allow null / missing (partial index)
  await games.createIndex(
    { txHash: 1 },
    {
      unique: true,
      partialFilterExpression: { txHash: { $type: "string" } },
    }
  );
  // Read path indexes
  await games.createIndex({ player: 1, timestamp: -1 });
  await games.createIndex({ timestamp: -1 });
}

if (process.env.NODE_ENV === "development") {
  // In dev, use global to preserve connection across hot reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create new client
  client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  const db = client.db("rugmania");

  if (!global._dbSetupPromise) {
    global._dbSetupPromise = ensureDbSetup(db).catch(() => {
      // If validator/index setup fails due to permissions, do not hard-fail the app.
    });
  }

  await global._dbSetupPromise;
  return db;
}

export default clientPromise;
