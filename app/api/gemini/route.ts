// app/api/gemini/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Try both env names; prefer GOOGLE_API_KEY if present.
const API_KEY = process.env.GOOGLE_API_KEY ?? process.env.API_KEY;
if (!API_KEY) {
    // Let POST handler also return a 500, but early guard helps in dev.
    console.warn("Missing GOOGLE_API_KEY / API_KEY env var for Gemini.");
}

// Create a single client; pick a reasonably fast model.
// (You can swap to "gemini-2.0-pro" if you want higher quality.)
const genAI = new GoogleGenerativeAI(API_KEY || "");
const flashModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

type Row = {
    Subreddit: string;
    Total_Posts?: number;
    Avg_Upvotes_Per_Post?: number;
    Median_Upvotes?: number;
    Avg_Comments_Per_Post?: number;
    Total_Upvotes?: number;
    Total_Comments?: number;
    Subreddit_Subscribers?: number;
    LastDateTimeUTC?: string;
    // Optional derived fields (if you already compute them client-side)
    decision_avg_upvotes?: number;
    tier?: "High" | "Medium" | "Low";
    posts_30d?: number;
    total_post_count?: number;
    avg_upvotes_all?: number;
    members?: number;
    days_since_last_post?: number;
};

function escapeHtml(s: string) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Convert **bold** to <strong>bold</strong> AFTER escaping HTML
function mdBoldToHtml(s: string) {
    // Use non-greedy match; supports multiple bold segments in a line
    return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

async function getInsightsFromAPI(prompt: string): Promise<string[]> {
    try {
        const result = await flashModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const text = result.response.text() || "";

        return text
            .split("\n")
            .map((line) => line.trim().replace(/^[*\-•]\s*/, "")) // strip bullets
            .filter(Boolean)
            .map((line) => mdBoldToHtml(escapeHtml(line)));       // <-- escape, then bold
    } catch (error) {
        console.error("Gemini insights error:", error);
        return ["Failed to generate insights. Please try again."];
    }
}


async function generateInsights(data: Row[]): Promise<string[]> {
    if (!data || data.length === 0) return [];

    // Allow both your raw `preview` rows and enriched rows
    const mapped: any[] = data.map((r) => ({
        subreddit: r.Subreddit,
        decision_avg_upvotes:
            typeof r.decision_avg_upvotes === "number"
                ? r.decision_avg_upvotes
                : typeof r.Median_Upvotes === "number"
                    ? r.Median_Upvotes
                    : r.Avg_Upvotes_Per_Post ?? 0,
        tier: r.tier ?? undefined,
        posts_30d: r.posts_30d ?? 0,
        total_post_count: r.total_post_count ?? r.Total_Posts ?? 0,
        avg_upvotes_all: r.avg_upvotes_all ?? r.Avg_Upvotes_Per_Post ?? 0,
        members: r.members ?? r.Subreddit_Subscribers ?? 0,
        days_since_last_post: r.days_since_last_post ?? undefined,
    }));

    const junkSubs = mapped
        .filter(
            (s) =>
                (s.total_post_count || 0) > 5 &&
                (s.avg_upvotes_all || 0) < 60 &&
                (s.members || 0) < 100_000
        )
        .map((s) => s.subreddit);

    const dataSample = JSON.stringify(mapped.slice(0, 25), null, 2);
    const junkSubList =
        junkSubs.length > 0
            ? `- Junk Tier Subreddits to Drop: ${junkSubs.join(", ")}`
            : "";

    const prompt = `
Analyze the following subreddit performance data. Provide 5 succinct, actionable insights for a social media manager.
Focus on practical advice about where to post more or less to maximize engagement (upvotes).
Do not mention subreddit size or subscribers.

Data Schema for each subreddit:
- subreddit
- decision_avg_upvotes (smart average of upvotes; primary indicator)
- tier ('High' | 'Medium' | 'Low')
- posts_30d
- total_post_count
- avg_upvotes_all
- members
- days_since_last_post

Rules:
1) Recommend posting more in 'High' tier, especially if days_since_last_post is high.
2) Identify consistently poor 'Low' tier.
3) If a poor performer has very few posts (<5), suggest testing properly before dropping.
4) Do not suggest dropping any subreddit with decision_avg_upvotes > 100 unless it's in bottom 20%.
5) If "Junk Tier" exist (high total_post_count & low avg_upvotes_all), list them and suggest dropping.
6) Keep insights brief and in bullet points.

Data Sample (Top 25 by performance):
${dataSample}

Identified Junk Tier Subreddits (if any):
${junkSubList}
`;
    return getInsightsFromAPI(prompt);
}

async function generate5DayPlan(data: Row[], postsPerDay: number): Promise<string> {
    if (!data || data.length === 0)
        return JSON.stringify({ error: "No data to generate a plan." });

    const high = data
        .filter((s: any) => s.tier === "High")
        .map((s: any) => s.Subreddit || (s as any).subreddit);
    const med = data
        .filter((s: any) => s.tier === "Medium")
        .map((s: any) => s.Subreddit || (s as any).subreddit);
    const low = data
        .filter((s: any) => s.tier === "Low")
        .map((s: any) => s.Subreddit || (s as any).subreddit);

    const sample = JSON.stringify(
        {
            highTier: high.slice(0, 25),
            mediumTier: med.slice(0, 25),
            lowTier: low.slice(0, 25),
        },
        null,
        2
    );

    const prompt = `
You are an expert social media strategist. Create a 5-day Reddit posting plan.
- ${postsPerDay} posts per day
- Prioritize High, rotate Medium, sparingly test Low
- Do not post in the same subreddit on consecutive days
- Output ONLY valid JSON (no markdown)

Format:
{
  "day_1": ["sub1", "sub2"],
  "day_2": ["sub3", "sub4"],
  "day_3": ["sub5", "sub6"],
  "day_4": ["sub7", "sub8"],
  "day_5": ["sub9", "sub10"]
}

Subreddit tiers (sample):
${sample}
`;

    try {
        // For JSON output with a schema, use generationConfig with responseMimeType + responseSchema.
        const result = await flashModel.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        day_1: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                        },
                        day_2: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                        },
                        day_3: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                        },
                        day_4: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                        },
                        day_5: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING },
                        },
                    },
                    required: ["day_1", "day_2", "day_3", "day_4", "day_5"],
                },
            },
        });

        // SDK returns a Response object with helpers:
        // When responseMimeType is application/json, .text() will still be a JSON string.
        let jsonText = (result.response.text() || "").trim();

        // Defensive: strip accidental code fences
        if (jsonText.startsWith("```json")) {
            jsonText = jsonText.replace(/^```json\s*|\s*```$/g, "").trim();
        } else if (jsonText.startsWith("```")) {
            jsonText = jsonText.replace(/^```\w*\s*|\s*```$/g, "").trim();
        }

        return jsonText;
    } catch (err) {
        console.error("Gemini plan error:", err);
        return JSON.stringify({ error: "Failed to generate plan." });
    }
}

export async function POST(req: NextRequest) {
    if (!API_KEY) {
        return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    try {
        const { mode, data, postsPerDay } = await req.json();

        if (mode === "insights") {
            const insights = await generateInsights(Array.isArray(data) ? data : []);
            return NextResponse.json({ insights });
        }

        if (mode === "plan") {
            const plan = await generate5DayPlan(
                Array.isArray(data) ? data : [],
                Number(postsPerDay) || 6
            );
            return NextResponse.json({ plan });
        }

        return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    } catch (e: any) {
        console.error("Gemini request failed:", e);
        return NextResponse.json(
            { error: e?.message || "Gemini request failed" },
            { status: 500 }
        );
    }
}
