import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appid: string }> }
) {
  const { appid } = await params;

  if (!appid) {
    return NextResponse.json({ error: "App ID is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`,
      {
        headers: {
          "Accept-Language": "en-US,en;q=0.9",
        },
        next: { revalidate: 86400 }, // Cache for 24 hours
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch from Steam API");
    }

    const data = await response.json();
    
    if (!data[appid] || !data[appid].success) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const gameData = data[appid].data;
    
    // Extract relevant information
    const result = {
      appid: gameData.steam_appid,
      name: gameData.name,
      short_description: gameData.short_description,
      genres: gameData.genres || [],
      categories: gameData.categories || [],
      developers: gameData.developers || [],
      publishers: gameData.publishers || [],
      release_date: gameData.release_date,
      metacritic: gameData.metacritic,
      recommendations: gameData.recommendations,
      header_image: gameData.header_image,
      is_free: gameData.is_free,
      price_overview: gameData.price_overview,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching game details:", error);
    return NextResponse.json(
      { error: "Failed to fetch game details" },
      { status: 500 }
    );
  }
}

