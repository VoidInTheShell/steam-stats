"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { SteamGame } from "../types/steam";
import { getCachedGames, setCachedGames, getCacheInfo } from "@/lib/cache";

interface GamesContextType {
  games: SteamGame[];
  loading: boolean;
  refreshing: boolean;
  fromCache: boolean;
  cacheAge: number | null;
  refresh: () => void;
}

const GamesContext = createContext<GamesContextType | null>(null);

export function useGames() {
  const context = useContext(GamesContext);
  if (!context) {
    throw new Error("useGames must be used within a GamesProvider");
  }
  return context;
}

export function GamesProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [games, setGames] = useState<SteamGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  const fetchGames = useCallback(async (steamId: string, forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = await getCachedGames(steamId);
      if (cached) {
        setGames(cached);
        setFromCache(true);
        const info = await getCacheInfo(steamId);
        setCacheAge(info.age);
        setLoading(false);
        return;
      }
    }

    setRefreshing(forceRefresh);
    try {
      const res = await axios.get(`/api/steam/games?steamId=${steamId}`);
      if (res.data.response && res.data.response.games) {
        const fetchedGames = res.data.response.games;
        setGames(fetchedGames);
        setFromCache(false);
        setCacheAge(null);
        await setCachedGames(steamId, fetchedGames);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      // @ts-expect-error - steamId is custom
      const steamId = session.user.steamId;
      if (steamId) {
        fetchGames(steamId);
      }
    }
  }, [session, fetchGames]);

  const refresh = useCallback(() => {
    if (session?.user) {
      // @ts-expect-error - steamId is custom
      const steamId = session.user.steamId;
      if (steamId) {
        fetchGames(steamId, true);
      }
    }
  }, [session, fetchGames]);

  return (
    <GamesContext.Provider value={{ games, loading, refreshing, fromCache, cacheAge, refresh }}>
      {children}
    </GamesContext.Provider>
  );
}

