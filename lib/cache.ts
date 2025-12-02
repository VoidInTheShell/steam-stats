import { openDB, DBSchema, IDBPDatabase } from "idb";
import { SteamGame } from "@/app/types/steam";

interface SteamStatsDB extends DBSchema {
  games: {
    key: string; // steamId
    value: {
      steamId: string;
      games: SteamGame[];
      timestamp: number;
    };
  };
}

const DB_NAME = "steam-stats-cache";
const DB_VERSION = 1;
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

let dbPromise: Promise<IDBPDatabase<SteamStatsDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SteamStatsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("games")) {
          db.createObjectStore("games", { keyPath: "steamId" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getCachedGames(steamId: string): Promise<SteamGame[] | null> {
  try {
    const db = await getDB();
    const cached = await db.get("games", steamId);
    
    if (!cached) return null;
    
    // Check if cache is expired
    const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
    if (isExpired) {
      await db.delete("games", steamId);
      return null;
    }
    
    return cached.games;
  } catch (error) {
    console.error("Error reading from cache:", error);
    return null;
  }
}

export async function setCachedGames(steamId: string, games: SteamGame[]): Promise<void> {
  try {
    const db = await getDB();
    await db.put("games", {
      steamId,
      games,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error writing to cache:", error);
  }
}

export async function clearCache(steamId?: string): Promise<void> {
  try {
    const db = await getDB();
    if (steamId) {
      await db.delete("games", steamId);
    } else {
      await db.clear("games");
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

export async function getCacheInfo(steamId: string): Promise<{ cached: boolean; age: number | null }> {
  try {
    const db = await getDB();
    const cached = await db.get("games", steamId);
    
    if (!cached) {
      return { cached: false, age: null };
    }
    
    const age = Date.now() - cached.timestamp;
    return { cached: true, age };
  } catch {
    return { cached: false, age: null };
  }
}

