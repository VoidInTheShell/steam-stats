import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
}

export async function POST(request: NextRequest) {
  try {
    const stats: GameStats = await request.json();

    const topGamesList = stats.topGames.map((g, i) => `${i + 1}. 《${g.name}》: ${g.hours}小时`).join('\n');
    const topGenresList = stats.topGenres.map((g, i) => `${i + 1}. ${g.name}: ${g.hours}小时, ${g.count}款游戏`).join('\n');

    const prompt = `你是一位资深的心理学家和游戏行为分析师，精通MBTI人格理论。请根据以下Steam游戏库数据，深度分析这位玩家的MBTI人格类型。

## 玩家游戏数据

### 基础统计
- 游戏库总数：${stats.totalGames} 款游戏
- 已游玩游戏：${stats.playedGames} 款 (${((stats.playedGames / stats.totalGames) * 100).toFixed(1)}%)
- 未游玩游戏：${stats.unplayedGames} 款
- 总游戏时长：${stats.totalPlaytimeHours.toLocaleString()} 小时（约 ${Math.round(stats.totalPlaytimeHours / 24)} 天）
- 平均每款游戏时长：${stats.averagePlaytimeHours.toFixed(1)} 小时
- 最近两周活跃游戏：${stats.recentlyPlayed} 款
- 超过一年未玩的游戏：${stats.oldestUnplayed} 款

### 最常玩的游戏类型
${topGenresList}

### 游玩时间最长的游戏（重要参考）
${topGamesList}

## 分析要求

请基于以上数据，特别是玩家最常玩的具体游戏，从以下四个维度深度分析该玩家的MBTI类型：

1. **E/I (外向/内向)**：考虑游戏选择是否倾向社交互动（如MMO、多人竞技）还是独自探索（如单机RPG、模拟经营）
2. **S/N (感知/直觉)**：考虑是否偏好具体实际的游戏（如体育、模拟器）还是抽象创意的游戏（如策略、独立艺术游戏）
3. **T/F (思考/情感)**：考虑是否偏好逻辑策略游戏（如战棋、RTS）还是故事情感驱动的游戏（如视觉小说、剧情RPG）
4. **J/P (判断/感知)**：考虑游戏完成度、是否专注少数游戏深度游玩还是广泛尝试各种游戏

**重要**：在分析中，请务必引用玩家实际游玩的具体游戏名称作为证据支撑你的分析。

请用以下JSON格式回复（只回复JSON，不要其他内容）：

{
  "mbtiType": "XXXX",
  "confidence": 85,
  "dimensions": {
    "EI": { 
      "result": "I", 
      "score": 65, 
      "reason": "详细分析原因，必须引用具体游戏名称作为证据，至少50字" 
    },
    "SN": { 
      "result": "N", 
      "score": 70, 
      "reason": "详细分析原因，必须引用具体游戏名称作为证据，至少50字" 
    },
    "TF": { 
      "result": "T", 
      "score": 55, 
      "reason": "详细分析原因，必须引用具体游戏名称作为证据，至少50字" 
    },
    "JP": { 
      "result": "P", 
      "score": 80, 
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
      { "name": "玩家库中最能代表其人格的游戏1", "reason": "为什么这款游戏代表了该人格" },
      { "name": "玩家库中最能代表其人格的游戏2", "reason": "为什么这款游戏代表了该人格" },
      { "name": "玩家库中最能代表其人格的游戏3", "reason": "为什么这款游戏代表了该人格" }
    ],
    "recommendedGenres": ["推荐尝试的游戏类型1", "推荐尝试的游戏类型2", "推荐尝试的游戏类型3"],
    "gamingStyle": {
      "playtimePattern": "描述玩家的游戏时间模式（如：深度沉浸型、广泛涉猎型等）",
      "decisionMaking": "描述玩家在游戏中的决策风格",
      "socialPreference": "描述玩家的游戏社交偏好"
    },
    "advice": "针对这位玩家的个性化建议，包括如何更好地享受游戏、避免潜在问题等，至少100字，引用其游戏库中的具体游戏给出建议"
  }
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: '你是一位专业的MBTI分析师和游戏心理学专家，擅长通过游戏行为分析人格类型。你的分析必须有深度、有洞察力，并且大量引用用户实际游玩的游戏作为证据。请严格按照要求的JSON格式回复。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse LLM response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error analyzing personality:', error);
    return NextResponse.json(
      { error: 'Failed to analyze personality', details: (error as Error).message },
      { status: 500 }
    );
  }
}
