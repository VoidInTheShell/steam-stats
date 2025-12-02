"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { SteamGame } from "../types/steam";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Loader2, RefreshCw, ChevronRight, Lightbulb, AlertTriangle, Gamepad2, Quote, Target, Users, Zap, Database } from "lucide-react";
import { getCachedPersonality, setCachedPersonality, generateGamesHash, clearPersonalityCache, getPersonalityCacheInfo } from "@/lib/cache";

interface SignatureGame {
  name: string;
  reason: string;
}

interface GamingStyle {
  playtimePattern: string;
  decisionMaking: string;
  socialPreference: string;
}

interface MBTIResult {
  mbtiType: string;
  confidence: number;
  dimensions: {
    EI: { result: string; score: number; reason: string };
    SN: { result: string; score: number; reason: string };
    TF: { result: string; score: number; reason: string };
    JP: { result: string; score: number; reason: string };
  };
  personality: {
    title: string;
    subtitle: string;
    description: string;
    strengths: string[];
    weaknesses: string[];
    signatureGames: SignatureGame[];
    recommendedGenres: string[];
    gamingStyle: GamingStyle;
    advice: string;
  };
}

interface GamerMBTIProps {
  games: SteamGame[];
  genreData: Array<{ name: string; hours: number; gameCount: number }>;
}

const MBTI_COLORS: Record<string, string> = {
  INTJ: "from-purple-600 to-indigo-600",
  INTP: "from-blue-600 to-cyan-600",
  ENTJ: "from-red-600 to-orange-600",
  ENTP: "from-amber-500 to-yellow-500",
  INFJ: "from-teal-600 to-emerald-600",
  INFP: "from-pink-500 to-rose-500",
  ENFJ: "from-green-500 to-teal-500",
  ENFP: "from-orange-500 to-amber-500",
  ISTJ: "from-slate-600 to-gray-600",
  ISFJ: "from-sky-600 to-blue-600",
  ESTJ: "from-red-700 to-rose-600",
  ESFJ: "from-pink-600 to-fuchsia-600",
  ISTP: "from-zinc-600 to-neutral-600",
  ISFP: "from-violet-500 to-purple-500",
  ESTP: "from-orange-600 to-red-600",
  ESFP: "from-yellow-500 to-orange-500",
};

const DIMENSION_LABELS: Record<string, [string, string]> = {
  EI: ["外向 (E)", "内向 (I)"],
  SN: ["感知 (S)", "直觉 (N)"],
  TF: ["思考 (T)", "情感 (F)"],
  JP: ["判断 (J)", "感知 (P)"],
};

export default function GamerMBTI({ games, genreData }: GamerMBTIProps) {
  const { data: session } = useSession();
  const [result, setResult] = useState<MBTIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCache, setLoadingCache] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  // @ts-expect-error - steamId is custom
  const steamId = session?.user?.steamId as string | undefined;

  const stats = useMemo(() => {
    const playedGames = games.filter(g => g.playtime_forever > 0);
    const unplayedGames = games.filter(g => g.playtime_forever === 0);
    const totalPlaytime = games.reduce((sum, g) => sum + g.playtime_forever, 0);
    
    const now = Date.now() / 1000;
    const twoWeeksAgo = now - 14 * 24 * 60 * 60;
    const oneYearAgo = now - 365 * 24 * 60 * 60;
    
    const recentlyPlayed = games.filter(g => g.rtime_last_played > twoWeeksAgo).length;
    const oldestUnplayed = games.filter(g => g.rtime_last_played < oneYearAgo || g.rtime_last_played === 0).length;
    
    const topGames = [...games]
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, 15)
      .map(g => ({ name: g.name, hours: Math.round(g.playtime_forever / 60) }));

    const topGenres = genreData.slice(0, 10).map(g => ({
      name: g.name,
      hours: g.hours,
      count: g.gameCount
    }));

    return {
      totalGames: games.length,
      playedGames: playedGames.length,
      unplayedGames: unplayedGames.length,
      totalPlaytimeHours: Math.round(totalPlaytime / 60),
      averagePlaytimeHours: playedGames.length > 0 ? totalPlaytime / 60 / playedGames.length : 0,
      topGenres,
      topGames,
      recentlyPlayed,
      oldestUnplayed,
      singlePlayerRatio: 0.7,
      indieRatio: 0.3,
      completionRate: playedGames.length / games.length
    };
  }, [games, genreData]);

  const gamesHash = useMemo(() => generateGamesHash(stats.topGames), [stats.topGames]);

  // Load from cache on mount
  useEffect(() => {
    const loadFromCache = async () => {
      if (!steamId) {
        setLoadingCache(false);
        return;
      }
      
      try {
        const cached = await getCachedPersonality(steamId, gamesHash);
        if (cached) {
          setResult(cached);
          setFromCache(true);
          const cacheInfo = await getPersonalityCacheInfo(steamId);
          setCacheAge(cacheInfo.age);
        }
      } catch (err) {
        console.error("Error loading from cache:", err);
      } finally {
        setLoadingCache(false);
      }
    };
    
    loadFromCache();
  }, [steamId, gamesHash]);

  const analyzePersonality = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    
    // Clear cache if force refresh
    if (forceRefresh && steamId) {
      await clearPersonalityCache(steamId);
    }
    
    try {
      const res = await fetch('/api/analyze-personality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stats)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Analysis failed');
      }
      
      const data = await res.json();
      setResult(data);
      setFromCache(false);
      setCacheAge(null);
      
      // Save to cache
      if (steamId) {
        await setCachedPersonality(steamId, data, stats.topGames);
      }
    } catch (err) {
      console.error('Error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const gradientClass = result ? MBTI_COLORS[result.mbtiType] || "from-primary to-blue-600" : "";

  return (
    <div className="space-y-6">
      {/* Loading Cache */}
      {loadingCache && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">检查缓存...</p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Trigger */}
      {!loadingCache && !result && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">发现你的游戏人格</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              基于你的 {stats.totalGames} 款游戏和 {stats.totalPlaytimeHours.toLocaleString()} 小时游戏时长，
              AI 将深度分析你的 MBTI 游戏人格类型
            </p>
            <Button 
              onClick={() => analyzePersonality(false)} 
              disabled={loading}
              size="lg"
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  AI 深度分析中...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  开始分析
                </>
              )}
            </Button>
            {error && (
              <p className="text-destructive text-sm mt-4">{error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Result Display */}
      {result && (
        <>
          {/* Main MBTI Card */}
          <Card className="overflow-hidden">
            <div className={`bg-gradient-to-r ${gradientClass} p-8 text-white`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/80 text-sm mb-1">你的游戏人格是</p>
                  <h1 className="text-5xl font-bold tracking-wider mb-2">{result.mbtiType}</h1>
                  <p className="text-2xl font-medium">{result.personality.title}</p>
                  {result.personality.subtitle && (
                    <p className="text-white/80 mt-1 italic">&ldquo;{result.personality.subtitle}&rdquo;</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="bg-white/20 rounded-full px-4 py-2 backdrop-blur-sm">
                    <p className="text-sm">置信度</p>
                    <p className="text-2xl font-bold">{result.confidence}%</p>
                  </div>
                </div>
              </div>
              <p className="text-white/90 leading-relaxed text-lg">
                {result.personality.description}
              </p>
            </div>
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => analyzePersonality(true)}
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  重新分析
                </Button>
                {fromCache && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Database className="h-3 w-3" />
                    <span>
                      来自缓存
                      {cacheAge && ` (${Math.round(cacheAge / 1000 / 60 / 60)}小时前)`}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gaming Style */}
          {result.personality.gamingStyle && (
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Target className="h-4 w-4" />
                    游戏时间模式
                  </div>
                  <p className="text-sm leading-relaxed">{result.personality.gamingStyle.playtimePattern}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Zap className="h-4 w-4" />
                    决策风格
                  </div>
                  <p className="text-sm leading-relaxed">{result.personality.gamingStyle.decisionMaking}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Users className="h-4 w-4" />
                    社交偏好
                  </div>
                  <p className="text-sm leading-relaxed">{result.personality.gamingStyle.socialPreference}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Dimensions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">人格维度深度分析</CardTitle>
              <CardDescription>基于你的游戏库数据分析各维度倾向</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {Object.entries(result.dimensions).map(([key, dim]) => {
                const labels = DIMENSION_LABELS[key];
                const isFirst = dim.result === key[0];
                
                return (
                  <div key={key} className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className={!isFirst ? "text-muted-foreground" : "font-semibold text-primary"}>
                        {labels[0]}
                      </span>
                      <span className={isFirst ? "text-muted-foreground" : "font-semibold text-primary"}>
                        {labels[1]}
                      </span>
                    </div>
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`absolute h-full bg-gradient-to-r ${gradientClass} transition-all`}
                        style={{ 
                          width: `${dim.score}%`,
                          left: isFirst ? 0 : 'auto',
                          right: isFirst ? 'auto' : 0
                        }}
                      />
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-foreground/30 rounded"
                        style={{ left: '50%', transform: 'translate(-50%, -50%)' }}
                      />
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">{dim.reason}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Signature Games */}
          {result.personality.signatureGames && result.personality.signatureGames.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  你的代表游戏
                </CardTitle>
                <CardDescription>最能体现你游戏人格的作品</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.personality.signatureGames.map((game, i) => (
                    <div key={i} className="flex gap-4 items-start p-4 bg-muted/50 rounded-lg">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${gradientClass} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">《{game.name}》</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{game.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Strengths */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-500" />
                  游戏优势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.personality.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm leading-relaxed">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Weaknesses */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  需要注意
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.personality.weaknesses.map((weakness, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm leading-relaxed">{weakness}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Recommended Genres */}
          {result.personality.recommendedGenres && result.personality.recommendedGenres.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  推荐探索的游戏类型
                </CardTitle>
                <CardDescription>基于你的人格，这些类型可能会让你有新的体验</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.personality.recommendedGenres.map((genre, i) => (
                    <Badge key={i} variant="secondary" className="text-sm py-1.5 px-4">
                      {genre}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advice */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                AI 个性化建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Quote className="absolute -top-2 -left-2 h-8 w-8 text-primary/20" />
                <p className="text-sm leading-relaxed pl-6">{result.personality.advice}</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
