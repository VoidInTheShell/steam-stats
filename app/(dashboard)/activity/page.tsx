"use client";

import { useGames } from "@/app/components/GamesProvider";
import ActivityHeatmap from "@/app/components/ActivityHeatmap";
import { Loader2 } from "lucide-react";

export default function ActivityPage() {
  const { games, loading } = useGames();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Activity Heatmap</h1>
        <p className="text-muted-foreground mt-1">
          Visualize your gaming patterns over the past year
        </p>
      </div>

      <ActivityHeatmap games={games} />
    </div>
  );
}

