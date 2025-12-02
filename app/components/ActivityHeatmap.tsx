"use client";

import { useMemo } from "react";
import { SteamGame } from "../types/steam";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

interface ActivityHeatmapProps {
  games: SteamGame[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ActivityHeatmap({ games }: ActivityHeatmapProps) {
  const { heatmapData, monthlyStats, yearlyTotal, mostActiveMonth, mostActiveDay } = useMemo(() => {
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    // Create a map of date -> games played
    const dateMap = new Map<string, { count: number; playtime: number; games: string[] }>();
    
    // Monthly aggregation
    const monthMap = new Map<string, { count: number; playtime: number }>();
    
    // Day of week aggregation
    const dayOfWeekMap = new Map<number, { count: number; playtime: number }>();
    for (let i = 0; i < 7; i++) {
      dayOfWeekMap.set(i, { count: 0, playtime: 0 });
    }
    
    games.forEach(game => {
      if (game.rtime_last_played) {
        const lastPlayed = new Date(game.rtime_last_played * 1000);
        
        // Only include games played in the last year
        if (lastPlayed >= oneYearAgo) {
          const dateKey = lastPlayed.toISOString().split('T')[0];
          const existing = dateMap.get(dateKey) || { count: 0, playtime: 0, games: [] };
          dateMap.set(dateKey, {
            count: existing.count + 1,
            playtime: existing.playtime + game.playtime_forever,
            games: [...existing.games, game.name]
          });
          
          // Monthly stats
          const monthKey = `${lastPlayed.getFullYear()}-${String(lastPlayed.getMonth() + 1).padStart(2, '0')}`;
          const monthExisting = monthMap.get(monthKey) || { count: 0, playtime: 0 };
          monthMap.set(monthKey, {
            count: monthExisting.count + 1,
            playtime: monthExisting.playtime + game.playtime_forever
          });
          
          // Day of week stats
          const dayOfWeek = lastPlayed.getDay();
          const dayExisting = dayOfWeekMap.get(dayOfWeek)!;
          dayOfWeekMap.set(dayOfWeek, {
            count: dayExisting.count + 1,
            playtime: dayExisting.playtime + game.playtime_forever
          });
        }
      }
    });
    
    // Generate heatmap grid (52 weeks x 7 days)
    const weeks: Array<Array<{ date: string; count: number; playtime: number; games: string[] }>> = [];
    const startDate = new Date(oneYearAgo);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
    
    let currentDate = new Date(startDate);
    let currentWeek: Array<{ date: string; count: number; playtime: number; games: string[] }> = [];
    
    while (currentDate <= now) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const data = dateMap.get(dateKey) || { count: 0, playtime: 0, games: [] };
      
      currentWeek.push({
        date: dateKey,
        count: data.count,
        playtime: data.playtime,
        games: data.games
      });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    // Find most active month
    let maxMonthActivity = 0;
    let mostActiveMonthKey = "";
    monthMap.forEach((value, key) => {
      if (value.count > maxMonthActivity) {
        maxMonthActivity = value.count;
        mostActiveMonthKey = key;
      }
    });
    
    // Find most active day of week
    let maxDayActivity = 0;
    let mostActiveDayIndex = 0;
    dayOfWeekMap.forEach((value, key) => {
      if (value.count > maxDayActivity) {
        maxDayActivity = value.count;
        mostActiveDayIndex = key;
      }
    });
    
    // Monthly stats for chart
    const monthlyStats: Array<{ month: string; count: number; playtime: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const data = monthMap.get(key) || { count: 0, playtime: 0 };
      monthlyStats.push({
        month: MONTHS[d.getMonth()],
        count: data.count,
        playtime: Math.round(data.playtime / 60)
      });
    }
    
    // Total games played in last year
    let yearlyTotal = 0;
    dateMap.forEach(value => yearlyTotal += value.count);
    
    return {
      heatmapData: weeks,
      monthlyStats,
      yearlyTotal,
      mostActiveMonth: mostActiveMonthKey ? new Date(mostActiveMonthKey + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "N/A",
      mostActiveDay: DAYS[mostActiveDayIndex]
    };
  }, [games]);

  const getColorIntensity = (count: number) => {
    if (count === 0) return "bg-muted";
    if (count === 1) return "bg-primary/20";
    if (count === 2) return "bg-primary/40";
    if (count <= 4) return "bg-primary/60";
    if (count <= 6) return "bg-primary/80";
    return "bg-primary";
  };

  const maxMonthlyCount = Math.max(...monthlyStats.map(m => m.count), 1);

  return (
    <div className="space-y-6">
      {/* GitHub-style Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Gaming Activity
          </CardTitle>
          <CardDescription>
            Games last played in the past year • {yearlyTotal} total sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Month labels */}
              <div className="flex mb-2 ml-8">
                {MONTHS.map((month, i) => (
                  <div key={month} className="flex-1 text-xs text-muted-foreground">
                    {i % 2 === 0 ? month : ""}
                  </div>
                ))}
              </div>
              
              {/* Heatmap grid */}
              <div className="flex gap-[3px]">
                {/* Day labels */}
                <div className="flex flex-col gap-[3px] mr-1">
                  {DAYS.map((day, i) => (
                    <div key={day} className="h-3 text-[10px] text-muted-foreground leading-3">
                      {i % 2 === 1 ? day : ""}
                    </div>
                  ))}
                </div>
                
                {/* Weeks */}
                {heatmapData.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {week.map((day, dayIndex) => (
                      <div
                        key={day.date}
                        className={`w-3 h-3 rounded-sm ${getColorIntensity(day.count)} transition-colors cursor-pointer hover:ring-1 hover:ring-primary`}
                        title={`${day.date}\n${day.count} games\n${day.games.slice(0, 3).join(", ")}${day.games.length > 3 ? ` +${day.games.length - 3} more` : ""}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-[3px]">
                  <div className="w-3 h-3 rounded-sm bg-muted" />
                  <div className="w-3 h-3 rounded-sm bg-primary/20" />
                  <div className="w-3 h-3 rounded-sm bg-primary/40" />
                  <div className="w-3 h-3 rounded-sm bg-primary/60" />
                  <div className="w-3 h-3 rounded-sm bg-primary/80" />
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Activity</CardTitle>
          <CardDescription>
            Most active month: {mostActiveMonth} • Favorite day: {mostActiveDay}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {monthlyStats.map((month) => (
              <div key={month.month} className="flex items-center gap-3">
                <span className="w-8 text-xs text-muted-foreground">{month.month}</span>
                <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-primary/80 rounded flex items-center justify-end pr-2 text-xs font-medium text-primary-foreground transition-all"
                    style={{ width: `${(month.count / maxMonthlyCount) * 100}%`, minWidth: month.count > 0 ? "40px" : "0" }}
                  >
                    {month.count > 0 && month.count}
                  </div>
                </div>
                <span className="w-16 text-xs text-muted-foreground text-right">
                  {month.playtime > 0 ? `${month.playtime}h` : "—"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

