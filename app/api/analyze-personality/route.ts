import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL,
  maxRetries: 0,
  timeout: 90000,
});

// 使用环境变量配置模型，默认为 gpt-5-nano
const MODEL_NAME = process.env.OPENAI_MODEL || "gpt-5-nano";

interface GameStats {
  totalGames: number;
  playedGames: number;
  unplayedGames: number;
  totalPlaytimeHours: number;
  averagePlaytimeHours: number;
  topGenres: Array<{ name: string; hours: number; count: number }>;
  topGames: Array<{ name: string; hours: number }>;
  recentlyPlayed: number;
  oldestUnplayed: number;
  singlePlayerRatio: number;
  indieRatio: number;
  completionRate: number;
  reviews?: {
    totalReviews: number;
    reviews: Array<{
      gameName: string;
      recommended: boolean;
      reviewText: string;
      hoursPlayed: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const stats: GameStats = await request.json();

    const topGamesList = stats.topGames
      .map((g, i) => `${i + 1}. 《${g.name}》: ${g.hours}小时`)
      .join("\n");
    const topGenresList = stats.topGenres
      .map((g, i) => `${i + 1}. ${g.name}: ${g.hours}小时, ${g.count}款游戏`)
      .join("\n");

    // Format reviews if available
    let reviewsSection = "";
    if (stats.reviews && stats.reviews.reviews.length > 0) {
      const reviewsList = stats.reviews.reviews
        .map((r) => {
          const sentiment = r.recommended ? "👍 推荐" : "👎 不推荐";
          return `- 《${r.gameName}》(${
            r.hoursPlayed
          }小时) ${sentiment}\n  评测摘要: "${r.reviewText.slice(0, 100)}${
            r.reviewText.length > 100 ? "..." : ""
          }"`;
        })
        .join("\n");
      reviewsSection = `
### 玩家评测（重要！反映玩家的思维方式和表达风格）
- 评测总数：${stats.reviews.totalReviews} 篇
${reviewsList}
`;
    }

    const prompt = `Analyze this Steam player's MBTI personality type based on their gaming data.

## Player Data

### Stats
- Total games: ${stats.totalGames} | Played: ${stats.playedGames} (${(
      (stats.playedGames / stats.totalGames) *
      100
    ).toFixed(1)}%)
- Total playtime: ${stats.totalPlaytimeHours.toLocaleString()}h (${Math.round(
      stats.totalPlaytimeHours / 24
    )} days)
- Avg per game: ${stats.averagePlaytimeHours.toFixed(1)}h
- Recently active: ${stats.recentlyPlayed} | Unplayed 1yr+: ${stats.oldestUnplayed}
- Single-player: ${(stats.singlePlayerRatio * 100).toFixed(0)}% | Indie: ${(stats.indieRatio * 100).toFixed(0)}%

### Top Genres
${topGenresList}

### Most Played Games
${topGamesList}
${reviewsSection}
## Analysis Requirements

Analyze MBTI dimensions based on actual game choices and behavior patterns:

**E/I**: Multiplayer/social vs single-player/immersive preferences
**S/N**: Realistic/tactical vs fantasy/creative game preferences
**T/F**: System optimization vs story/emotion focus (check review writing style)
**J/P**: Completion/planning vs exploration/flexibility patterns

**Important**:
- Cite specific games as evidence
- Avoid stereotypes (single-player ≠ introvert, large library ≠ P-type)
- Each dimension is independent
- Select 4 signature games from DIFFERENT genres

Return JSON in Chinese (中文回复):

{
  "mbtiType": "XXXX",
  "confidence": 85,
  "dimensions": {
    "EI": { 
      "result": "E或I", 
      "score": 50-100, 
      "reason": "详细分析原因，必须引用具体游戏名称作为证据，至少50字" 
    },
    "SN": { 
      "result": "S或N", 
      "score": 50-100, 
      "reason": "详细分析原因，必须引用具体游戏名称作为证据，至少50字" 
    },
    "TF": { 
      "result": "T或F", 
      "score": 50-100, 
      "reason": "详细分析原因，必须引用具体游戏名称作为证据，至少50字" 
    },
    "JP": { 
      "result": "J或P", 
      "score": 50-100, 
      "reason": "详细分析原因，必须引用具体游戏名称作为证据，至少50字" 
    }
  },
  "personality": {
    "title": "MBTI官方人格名称（如：建筑师、冒险家、逻辑学家等）",
    "subtitle": "一句话游戏风格标语",
    "description": "3-4句话详细描述这种玩家的游戏风格和习惯，引用玩家实际玩的游戏来说明",
    "strengths": ["优势1：具体描述", "优势2：具体描述", "优势3：具体描述"],
    "weaknesses": ["弱点1：具体描述", "弱点2：具体描述"],
    "signatureGames": [
      { "name": "游戏名称", "genre": "游戏类型", "category": "主力游戏", "reason": "为什么选择这款游戏" },
      { "name": "游戏名称", "genre": "游戏类型", "category": "近期热衷", "reason": "为什么选择这款游戏" },
      { "name": "游戏名称", "genre": "游戏类型", "category": "隐藏宝藏", "reason": "为什么选择这款游戏" },
      { "name": "游戏名称", "genre": "游戏类型", "category": "跨界之选", "reason": "与主要偏好不同类型的游戏，体现多样性" }
    ],
    "recommendedGenres": ["推荐尝试的游戏类型1", "推荐尝试的游戏类型2", "推荐尝试的游戏类型3"],
    "gamingStyle": {
      "playtimePattern": "描述玩家的游戏时间模式（如：深度沉浸型、广泛涉猎型等）",
      "decisionMaking": "描述玩家在游戏中的决策风格",
      "socialPreference": "描述玩家的游戏社交偏好"
    },
    "advice": "针对这位玩家的个性化建议，包括如何更好地享受游戏、避免潜在问题等，至少100字，引用其游戏库中的具体游戏给出建议"
  },
  "shareCard": {
    "tagline": "8-12字的精炼游戏风格标语，如「系统探索者」「虚拟世界建筑师」",
    "summary": "一句话总结（20-30字），解释为什么得到这个MBTI结果，要提及具体游戏",
    "highlights": ["特点1（8字内）", "特点2（8字内）", "特点3（8字内）"]
  }
}`;

    console.log(`[API] Using model: ${MODEL_NAME}`);
    console.log(`[API] Starting OpenAI request...`);

    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "system",
          content: "You are a professional MBTI analyst and gaming psychologist. Analyze objectively without stereotypes. Key principles: 1) All 16 MBTI types are equally distributed among gamers; 2) Playing single-player games doesn't mean introversion; 3) Large game library doesn't mean P-type; 4) Each dimension is independent. IMPORTANT: You MUST respond in Chinese (中文). All analysis, descriptions, and JSON content must be in Chinese."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 16000
    });

    console.log(`[API] OpenAI request completed`);
    console.log(`[API] Response tokens: ${response.usage?.total_tokens || 'unknown'}`);

    const responseText = response.choices[0].message.content || "";

    if (!responseText) {
      throw new Error("Empty response from OpenAI");
    }

    console.log(`[API] Response length: ${responseText.length} characters`);
    console.log(`[API] Response preview: ${responseText.substring(0, 100)}...`);

    // JSON mode guarantees valid JSON output
    const result = JSON.parse(responseText);

    console.log(`[API] JSON parsed successfully, MBTI type: ${result.mbtiType || 'unknown'}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error analyzing personality:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze personality",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
