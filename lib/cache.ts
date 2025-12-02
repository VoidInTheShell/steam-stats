import { openDB, DBSchema, IDBPDatabase } from "idb";
import { SteamGame } from "@/app/types/steam";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MBTIResult = any; // Flexible type for MBTI result

interface GameDetails {
  appid: number;
  genres: string[];
  price: number | null;
  developers: string[];
  metacritic: { score: number } | null;
  timestamp: number;
}

interface SteamStatsDB extends DBSchema {
  games: {
    key: string; // steamId
    value: {
      steamId: string;
      games: SteamGame[];
      timestamp: number;
    };
  };
  personality: {
    key: string; // steamId
    value: {
      steamId: string;
      result: MBTIResult;
      gamesHash: string; // Hash of top games to detect changes
      timestamp: number;
    };
  };
  gameDetails: {
    key: number; // appid
    value: GameDetails;
  };
}

const DB_NAME = "steam-stats-cache";
const DB_VERSION = 3; // Bumped version for gameDetails store
const GAMES_CACHE_DURATION = 1000 * 60 * 30; // 30 minutes
const PERSONALITY_CACHE_DURATION = 1000 * 60 * 60 * 24 * 7; // 7 days
const GAME_DETAILS_CACHE_DURATION = 1000 * 60 * 60 * 24 * 30; // 30 days

let dbPromise: Promise<IDBPDatabase<SteamStatsDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SteamStatsDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains("games")) {
            db.createObjectStore("games", { keyPath: "steamId" });
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("personality")) {
            db.createObjectStore("personality", { keyPath: "steamId" });
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains("gameDetails")) {
            db.createObjectStore("gameDetails", { keyPath: "appid" });
          }
        }
      },
    });
  }
  return dbPromise;
}

// Games cache functions
export async function getCachedGames(steamId: string): Promise<SteamGame[] | null> {
  try {
    const db = await getDB();
    const cached = await db.get("games", steamId);
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > GAMES_CACHE_DURATION;
    if (isExpired) {
      await db.delete("games", steamId);
      return null;
    }
    
    return cached.games;
  } catch (error) {
    console.error("Error reading games from cache:", error);
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
    console.error("Error writing games to cache:", error);
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

// Personality cache functions
function generateGamesHash(games: Array<{ name: string; hours: number }>): string {
  // Create a simple hash based on top games to detect library changes
  return games.slice(0, 10).map(g => `${g.name}:${g.hours}`).join("|");
}

export async function getCachedPersonality(
  steamId: string, 
  currentGamesHash: string
): Promise<MBTIResult | null> {
  try {
    const db = await getDB();
    const cached = await db.get("personality", steamId);
    
    if (!cached) return null;
    
    // Check if cache is expired
    const isExpired = Date.now() - cached.timestamp > PERSONALITY_CACHE_DURATION;
    if (isExpired) {
      await db.delete("personality", steamId);
      return null;
    }
    
    // Check if games have changed significantly
    if (cached.gamesHash !== currentGamesHash) {
      console.log("Games changed, invalidating personality cache");
      await db.delete("personality", steamId);
      return null;
    }
    
    return cached.result;
  } catch (error) {
    console.error("Error reading personality from cache:", error);
    return null;
  }
}

export async function setCachedPersonality(
  steamId: string, 
  result: MBTIResult,
  topGames: Array<{ name: string; hours: number }>
): Promise<void> {
  try {
    const db = await getDB();
    await db.put("personality", {
      steamId,
      result,
      gamesHash: generateGamesHash(topGames),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error writing personality to cache:", error);
  }
}

export async function getPersonalityCacheInfo(steamId: string): Promise<{ cached: boolean; age: number | null }> {
  try {
    const db = await getDB();
    const cached = await db.get("personality", steamId);
    
    if (!cached) {
      return { cached: false, age: null };
    }
    
    const age = Date.now() - cached.timestamp;
    return { cached: true, age };
  } catch {
    return { cached: false, age: null };
  }
}

export async function clearPersonalityCache(steamId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete("personality", steamId);
  } catch (error) {
    console.error("Error clearing personality cache:", error);
  }
}

// Clear all caches
export async function clearCache(steamId?: string): Promise<void> {
  try {
    const db = await getDB();
    if (steamId) {
      await db.delete("games", steamId);
      await db.delete("personality", steamId);
    } else {
      await db.clear("games");
      await db.clear("personality");
      await db.clear("gameDetails");
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

// Game details cache functions
export async function getCachedGameDetails(appid: number): Promise<GameDetails | null> {
  try {
    const db = await getDB();
    const cached = await db.get("gameDetails", appid);
    
    if (!cached) return null;
    
    // Check if cache is expired
    const isExpired = Date.now() - cached.timestamp > GAME_DETAILS_CACHE_DURATION;
    if (isExpired) {
      await db.delete("gameDetails", appid);
      return null;
    }
    
    return cached;
  } catch (error) {
    console.error("Error reading game details from cache:", error);
    return null;
  }
}

export async function setCachedGameDetails(
  appid: number,
  genres: string[],
  price: number | null,
  developers: string[],
  metacritic: { score: number } | null
): Promise<void> {
  try {
    const db = await getDB();
    await db.put("gameDetails", {
      appid,
      genres,
      price,
      developers,
      metacritic,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error writing game details to cache:", error);
  }
}

export async function getCachedGameDetailsMany(appids: number[]): Promise<Map<number, GameDetails>> {
  const result = new Map<number, GameDetails>();
  try {
    const db = await getDB();
    const now = Date.now();
    
    for (const appid of appids) {
      const cached = await db.get("gameDetails", appid);
      if (cached && now - cached.timestamp < GAME_DETAILS_CACHE_DURATION) {
        result.set(appid, cached);
      }
    }
  } catch (error) {
    console.error("Error reading game details batch from cache:", error);
  }
  return result;
}

export { generateGamesHash };
export type { GameDetails };
