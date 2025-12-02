import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Extract steamId from token.sub (format: https://steamcommunity.com/openid/id/XXXXXXX)
  const steamId = token.sub?.split("/").pop();

  if (!steamId) {
    return NextResponse.json({ error: "Steam ID not found" }, { status: 400 });
  }

  try {
    // Fetch user's reviews from Steam Community
    const response = await fetch(
      `https://steamcommunity.com/profiles/${steamId}/reviews/?p=1`,
      {
        headers: {
          "Accept": "text/html",
          "User-Agent": "Mozilla/5.0 (compatible; SteamStats/1.0)",
        },
      }
    );

    if (!response.ok) {
      console.error(`[Reviews API Error] steamId=${steamId}, status=${response.status}, statusText=${response.statusText}`);
      return NextResponse.json({
        totalReviews: 0,
        reviews: [],
        _error: `Steam returned ${response.status}: ${response.statusText}`,
      });
    }

    const html = await response.text();
    console.log(`[Reviews API] steamId=${steamId}, fetched ${html.length} bytes`);
    
    // Parse reviews from HTML (basic extraction)
    const reviews: Array<{
      gameName: string;
      recommended: boolean;
      reviewText: string;
      hoursPlayed: string;
    }> = [];

    // Match review cards
    const reviewCardRegex = /<div class="review_box[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    const gameNameRegex = /<div class="title"[^>]*>([^<]+)<\/div>/;
    const recommendedRegex = /title="(Recommended|Not Recommended)"/;
    const hoursRegex = /(\d+[\d,\.]*)\s*hrs?\s*on record/i;
    const contentRegex = /<div class="content"[^>]*>([\s\S]*?)<\/div>/;

    let match;
    while ((match = reviewCardRegex.exec(html)) !== null && reviews.length < 10) {
      const cardHtml = match[1];
      
      const gameMatch = gameNameRegex.exec(cardHtml);
      const recommendedMatch = recommendedRegex.exec(cardHtml);
      const hoursMatch = hoursRegex.exec(cardHtml);
      const contentMatch = contentRegex.exec(cardHtml);

      if (gameMatch) {
        reviews.push({
          gameName: gameMatch[1].trim(),
          recommended: recommendedMatch ? recommendedMatch[1] === "Recommended" : true,
          reviewText: contentMatch ? contentMatch[1].replace(/<[^>]*>/g, "").trim().slice(0, 200) : "",
          hoursPlayed: hoursMatch ? hoursMatch[1] : "0",
        });
      }
    }

    // Alternative: try to get review count and basic info from profile
    const reviewCountMatch = html.match(/(\d+)\s*Reviews?/i);
    const totalReviews = reviewCountMatch ? parseInt(reviewCountMatch[1]) : reviews.length;

    console.log(`[Reviews API] steamId=${steamId}, parsed ${reviews.length} reviews, totalReviews=${totalReviews}`);

    return NextResponse.json({
      totalReviews,
      reviews,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[Reviews API Error] steamId=${steamId}, error=${errorMessage}`, errorStack ? `\nStack: ${errorStack}` : "");
    // Return empty reviews instead of error to not break the flow
    return NextResponse.json({
      totalReviews: 0,
      reviews: [],
      _error: errorMessage,
    });
  }
}

