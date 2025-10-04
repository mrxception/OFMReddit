import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { verifyToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    const {
      mode,
      physicalFeatures,
      gender,
      subredditType,
      visualContext,
      degenScale,
      captionMood,
      rules,
      creativeStyle,
      postId,
      isInteractive, // Added new field
    } = body

    if (!mode || !gender) {
      return NextResponse.json({ error: "Missing required fields: mode and gender are required" }, { status: 400 })
    }

    if (postId) {
      const posts = await query("SELECT id FROM posts WHERE id = ? AND user_id = ?", [postId, payload.userId])
      if ((posts as any[]).length === 0) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 })
      }
    }

    let prompt = ""
    if (mode === "keywords") {
      prompt = `Generate 5 creative and engaging Reddit post captions for adult content.

Physical features: ${physicalFeatures || "not specified"}
Gender: ${gender}
Visual context: ${visualContext || "not specified"}
Mood: ${captionMood || "seductive"}
Creative style: ${creativeStyle || "not specified"}

Generate 5 different caption options that are ${degenScale === 1 ? "suggestive" : degenScale === 2 ? "direct" : "explicit"}, seductive, and engaging for Reddit. Each caption should be 150–200 characters long.
${isInteractive ? "Include an interactive/clickbait style, using questions (e.g., 'Would you introduce me to your parents?') to encourage comments like 'yes' or 'no'." : ""}

Return ONLY a valid JSON array of 5 objects, each with 'option' (number from 1 to 5) and 'text' (string) fields. Do not include any text before or after the JSON array. Ensure the JSON is parseable without errors.
Example:
[
  {"option": 1, "text": "Draped in silk, I tease with a sultry glance in the candlelit room, daring you to come closer and unravel my secrets."},
  {"option": 2, "text": "My curves catch the moonlight, whispering temptations as I lounge seductively, waiting for your gaze to linger."},
  {"option": 3, "text": "In the heat of the night, my playful touch invites you to explore every inch of this forbidden fantasy."},
  {"option": 4, "text": "Soft whispers and a mischievous smile—join me in this steamy moment where desires ignite and boundaries fade."},
  {"option": 5, "text": "Basking in the glow of desire, I tempt you with every move, promising a night of electrifying passion."}
]`
    } else {
      prompt = `Generate 5 creative and engaging Reddit post captions for adult content.

Physical features/niche: ${physicalFeatures || "not specified"}
Gender: ${gender}
Subreddit type: ${subredditType || "not specified"}
Visual context: ${visualContext || "not specified"}
Caption mood: ${captionMood || "seductive"}
Rules to follow: ${rules || "none"}
Creative style: ${creativeStyle || "not specified"}
Explicitness level: ${degenScale === 1 ? "suggestive" : degenScale === 2 ? "direct" : "explicit"}

Generate 5 different caption options that are seductive, match the mood and explicitness level, are appropriate for the specified subreddit type, follow the creative style if specified, and are 150–200 characters long.
${isInteractive ? "Include an interactive/clickbait style, using questions (e.g., 'Would you introduce me to your parents?') to encourage comments like 'yes' or 'no'." : ""}

Return ONLY a valid JSON array of 5 objects, each with 'option' (number from 1 to 5) and 'text' (string) fields. Do not include any text before or after the JSON array. Ensure the JSON is parseable without errors.
Example:
[
  {"option": 1, "text": "Draped in silk, I tease with a sultry glance in the candlelit room, daring you to come closer and unravel my secrets."},
  {"option": 2, "text": "My curves catch the moonlight, whispering temptations as I lounge seductively, waiting for your gaze to linger."},
  {"option": 3, "text": "In the heat of the night, my playful touch invites you to explore every inch of this forbidden fantasy."},
  {"option": 4, "text": "Soft whispers and a mischievous smile—join me in this steamy moment where desires ignite and boundaries fade."},
  {"option": 5, "text": "Basking in the glow of desire, I tempt you with every move, promising a night of electrifying passion."}
]`
    }

    const apiKey = process.env.HUGGINGFACE_API_KEY
    if (!apiKey) {
      throw new Error("HUGGINGFACE_API_KEY is not set in environment variables")
    }

    let response
    for (let attempt = 1; attempt <= 3; attempt++) {
      response = await fetch("https://router.huggingface.co/novita/v3/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that generates captions. Your response must be exactly a valid JSON array with 5 objects, each having 'option' (number from 1 to 5) and 'text' (string). Do not include any text before or after the JSON array. Ensure the JSON is parseable without errors.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "deepseek/deepseek-v3-0324",
          stream: false,
          max_tokens: 1000,
          temperature: 0.7,
          top_p: 0.9,
        }),
      })

      if (response.status !== 429) break
      console.log(`Rate limit hit, retrying (${attempt}/3)...`)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }

    if (!response || !response.ok) {
      const errorText = (await response?.text()) || "No response"
      throw new Error(`Hugging Face API error: ${response?.status || "unknown"} - ${errorText}`)
    }

    const result = await response.json()

    const text = result.choices?.[0]?.message?.content
    if (!text) {
      throw new Error("No content returned from Hugging Face API")
    }

    let captions
    try {
      captions = JSON.parse(text)
      if (!Array.isArray(captions) || captions.length !== 5 || !captions.every((c: any) => c.option && c.text)) {
        throw new Error("Invalid captions format")
      }
    } catch (error) {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error("Failed to parse captions from AI response")
      }
      captions = JSON.parse(jsonMatch[0])
      if (!Array.isArray(captions) || captions.length !== 5 || !captions.every((c: any) => c.option && c.text)) {
        throw new Error("Invalid captions format in fallback parsing")
      }
    }

    if (postId) {
      await query("DELETE FROM captions WHERE post_id = ?", [postId])

      for (const caption of captions) {
        await query("INSERT INTO captions (post_id, option_number, text) VALUES (?, ?, ?)", [
          postId,
          caption.option,
          caption.text,
        ])
      }
    }

    return NextResponse.json({ captions })
  } catch (error: any) {
    console.error("Error generating captions:", error)
    return NextResponse.json({ error: error.message || "Failed to generate captions" }, { status: 500 })
  }
}