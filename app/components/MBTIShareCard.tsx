"use client";

import { forwardRef, useEffect, useState } from "react";
import { Gamepad2, Sparkles } from "lucide-react";

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
    signatureGames: Array<{
      name: string;
      reason: string;
      genre?: string;
      category?: string;
    }>;
    gamingStyle: {
      playtimePattern: string;
      decisionMaking: string;
      socialPreference: string;
    };
  };
}

interface GameIconMap {
  [gameName: string]: {
    appid: number;
    iconUrl: string;
  };
}

interface MBTIShareCardProps {
  result: MBTIResult;
  totalGames: number;
  totalHours: number;
  userName?: string;
  userAvatar?: string;
  steamId?: string;
  gameIcons?: GameIconMap;
}

// 16personalities official styling - exported for use in other components
export const MBTI_CONFIG: Record<
  string,
  {
    name: string;
    slug: string;
    color: string;
    bgColor: string;
    group: string;
  }
> = {
  // Analysts - Purple
  INTJ: {
    name: "建筑师",
    slug: "intj-architect",
    color: "#88619a",
    bgColor: "#f3ebf6",
    group: "分析家",
  },
  INTP: {
    name: "逻辑学家",
    slug: "intp-logician",
    color: "#88619a",
    bgColor: "#f3ebf6",
    group: "分析家",
  },
  ENTJ: {
    name: "指挥官",
    slug: "entj-commander",
    color: "#88619a",
    bgColor: "#f3ebf6",
    group: "分析家",
  },
  ENTP: {
    name: "辩论家",
    slug: "entp-debater",
    color: "#88619a",
    bgColor: "#f3ebf6",
    group: "分析家",
  },
  // Diplomats - Green
  INFJ: {
    name: "提倡者",
    slug: "infj-advocate",
    color: "#33a474",
    bgColor: "#e8f6ef",
    group: "外交家",
  },
  INFP: {
    name: "调停者",
    slug: "infp-mediator",
    color: "#33a474",
    bgColor: "#e8f6ef",
    group: "外交家",
  },
  ENFJ: {
    name: "主人公",
    slug: "enfj-protagonist",
    color: "#33a474",
    bgColor: "#e8f6ef",
    group: "外交家",
  },
  ENFP: {
    name: "竞选者",
    slug: "enfp-campaigner",
    color: "#33a474",
    bgColor: "#e8f6ef",
    group: "外交家",
  },
  // Sentinels - Blue
  ISTJ: {
    name: "物流师",
    slug: "istj-logistician",
    color: "#4298b4",
    bgColor: "#e8f4f8",
    group: "守护者",
  },
  ISFJ: {
    name: "守卫者",
    slug: "isfj-defender",
    color: "#4298b4",
    bgColor: "#e8f4f8",
    group: "守护者",
  },
  ESTJ: {
    name: "总经理",
    slug: "estj-executive",
    color: "#4298b4",
    bgColor: "#e8f4f8",
    group: "守护者",
  },
  ESFJ: {
    name: "执政官",
    slug: "esfj-consul",
    color: "#4298b4",
    bgColor: "#e8f4f8",
    group: "守护者",
  },
  // Explorers - Yellow
  ISTP: {
    name: "鉴赏家",
    slug: "istp-virtuoso",
    color: "#e4ae3a",
    bgColor: "#fdf6e3",
    group: "探险家",
  },
  ISFP: {
    name: "探险家",
    slug: "isfp-adventurer",
    color: "#e4ae3a",
    bgColor: "#fdf6e3",
    group: "探险家",
  },
  ESTP: {
    name: "企业家",
    slug: "estp-entrepreneur",
    color: "#e4ae3a",
    bgColor: "#fdf6e3",
    group: "探险家",
  },
  ESFP: {
    name: "表演者",
    slug: "esfp-entertainer",
    color: "#e4ae3a",
    bgColor: "#fdf6e3",
    group: "探险家",
  },
};

const MBTIShareCard = forwardRef<HTMLDivElement, MBTIShareCardProps>(
  (
    {
      result,
      totalGames,
      totalHours,
      userName,
      userAvatar,
      steamId,
      gameIcons,
    },
    ref
  ) => {
    const config = MBTI_CONFIG[result.mbtiType] || MBTI_CONFIG.INTJ;
    const avatarPath = `/mbti/${config.slug}.svg`;
    const [avatarDataUrl, setAvatarDataUrl] = useState<string>("");
    const [userAvatarDataUrl, setUserAvatarDataUrl] = useState<string>("");
    const [gameIconDataUrls, setGameIconDataUrls] = useState<
      Record<string, string>
    >({});

    // Convert images to data URLs for html-to-image compatibility
    useEffect(() => {
      // Helper to check if URL is external
      const isExternalUrl = (url: string): boolean => {
        return url.startsWith("http://") || url.startsWith("https://");
      };

      // Load image and convert to data URL
      // For external images, use our proxy to avoid CORS issues
      const loadImage = async (url: string): Promise<string> => {
        try {
          const fetchUrl = isExternalUrl(url)
            ? `/api/image-proxy?url=${encodeURIComponent(url)}`
            : url;

          const response = await fetch(fetchUrl);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch {
          return url;
        }
      };

      loadImage(avatarPath).then(setAvatarDataUrl);
      if (userAvatar) {
        loadImage(userAvatar).then(setUserAvatarDataUrl);
      }

      // Load game icons
      if (gameIcons && result.personality.signatureGames) {
        const loadGameIcons = async () => {
          const urls: Record<string, string> = {};
          for (const game of result.personality.signatureGames.slice(0, 4)) {
            const iconInfo = gameIcons[game.name];
            if (iconInfo?.iconUrl) {
              urls[game.name] = await loadImage(iconInfo.iconUrl);
            }
          }
          setGameIconDataUrls(urls);
        };
        loadGameIcons();
      }
    }, [avatarPath, userAvatar, gameIcons, result.personality.signatureGames]);

    return (
      <div
        ref={ref}
        className="w-[480px] rounded-2xl overflow-hidden shadow-2xl bg-white"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {/* Header */}
        <div
          className="relative overflow-hidden"
          style={{ backgroundColor: config.bgColor }}
        >
          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 100% 0%, ${config.color}22 0%, transparent 50%)`,
            }}
          />

          <div className="relative p-6">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-4">
              <div
                className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full text-white"
                style={{ backgroundColor: config.color }}
              >
                {config.group}
              </div>
              <div
                className="flex items-center gap-2 text-sm"
                style={{ color: config.color }}
              >
                <Gamepad2 className="h-4 w-4" />
                <span className="font-medium">Steam Stats</span>
              </div>
            </div>

            {/* Main content */}
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative">
                {avatarDataUrl && (
                  <img
                    src={avatarDataUrl}
                    alt={result.mbtiType}
                    className="w-28 h-28 object-contain"
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1
                  className="text-4xl font-bold tracking-wide mb-1"
                  style={{ color: config.color }}
                >
                  {result.mbtiType}
                </h1>
                <p className="text-xl font-semibold mb-1 text-gray-800">
                  {config.name}
                </p>
                <p className="text-sm text-gray-500">
                  {result.personality.title}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div className="px-6 py-4 bg-white border-b border-gray-100">
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(result.dimensions).map(([key, dim]) => {
              const leftLetter = key[0];
              const rightLetter = key[1];
              const isLeft = dim.result === leftLetter;

              return (
                <div key={key} className="text-center">
                  <div className="flex justify-center gap-1 mb-1">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                        isLeft ? "text-white" : "bg-gray-200 text-gray-400"
                      }`}
                      style={
                        isLeft ? { backgroundColor: config.color } : undefined
                      }
                    >
                      {leftLetter}
                    </span>
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
                        !isLeft ? "text-white" : "bg-gray-200 text-gray-400"
                      }`}
                      style={
                        !isLeft ? { backgroundColor: config.color } : undefined
                      }
                    >
                      {rightLetter}
                    </span>
                  </div>
                  <div
                    className="text-lg font-bold"
                    style={{ color: config.color }}
                  >
                    {dim.score}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Signature Games */}
        {result.personality.signatureGames?.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Gamepad2 className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                代表游戏
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {result.personality.signatureGames.slice(0, 4).map((game, i) => {
                const iconInfo = gameIcons?.[game.name];
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white border border-gray-100 shadow-sm"
                  >
                    {game.category && (
                      <span
                        className="text-[8px] px-1.5 py-0.5 rounded font-medium mb-0.5 text-white"
                        style={{ backgroundColor: config.color }}
                      >
                        {game.category}
                      </span>
                    )}
                    {gameIconDataUrls[game.name] ? (
                      <img
                        src={gameIconDataUrls[game.name]}
                        alt={game.name}
                        className="w-9 h-9 rounded-lg shadow-sm"
                      />
                    ) : iconInfo?.iconUrl ? (
                      <img
                        src={iconInfo.iconUrl}
                        alt={game.name}
                        className="w-9 h-9 rounded-lg shadow-sm"
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: config.color }}
                      >
                        {game.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-[9px] font-medium text-gray-700 text-center leading-tight line-clamp-2">
                      {game.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Strengths */}
        {result.personality.strengths?.length > 0 && (
          <div className="px-6 py-4 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                游戏优势
              </span>
            </div>
            <ul className="space-y-2">
              {result.personality.strengths.slice(0, 3).map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="line-clamp-1">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div
          className="px-6 py-3 flex items-center justify-between"
          style={{ backgroundColor: config.color }}
        >
          <div className="flex items-center gap-3">
            {userAvatarDataUrl && (
              <img
                src={userAvatarDataUrl}
                alt={userName || "User"}
                className="w-8 h-8 rounded-full border-2 border-white/30"
              />
            )}
            <div>
              {userName && (
                <p className="text-sm font-medium text-white">{userName}</p>
              )}
              {steamId && (
                <p className="text-[10px] text-white/60">ID: {steamId}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-white/80">
              <Gamepad2 className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">steamstats.app</span>
            </div>
            <p className="text-[10px] mt-0.5 text-white/60">
              {totalGames} games · {totalHours.toLocaleString()}h
            </p>
          </div>
        </div>
      </div>
    );
  }
);

MBTIShareCard.displayName = "MBTIShareCard";

export default MBTIShareCard;
