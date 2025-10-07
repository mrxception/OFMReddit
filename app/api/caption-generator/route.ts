"use client"

import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import OpenAI from "openai"

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
      isInteractive,
      contentType,
      subredditName,
    } = body

    if (!mode || !gender) {
      return NextResponse.json({ error: "Missing required fields: mode and gender are required" }, { status: 400 })
    }

    let prompt = ""
    if (mode === "keywords") {
      prompt = `Generate 5 creative and engaging Reddit post captions for adult content based on simple keywords.

Key details:
- Keywords/Features: ${physicalFeatures || "not specified"}
- Gender: ${gender}
- Explicitness level: ${degenScale === 1 ? "suggestive and playful" : degenScale === 2 ? "direct and flirty" : "explicit and bold"}

Generate 5 distinct caption options that are ${degenScale === 1 ? "suggestive" : degenScale === 2 ? "direct" : "explicit"} and engaging for Reddit. Each caption should be 150–200 characters long and incorporate the keywords naturally.

Return ONLY a valid JSON array of 5 objects, each with 'option' (number from 1 to 5) and 'text' (string) fields. Do not include any text before or after the JSON array. Ensure the JSON is parseable without errors.
Example:
[
  {"option": 1, "text": "Draped in silk, I tease with a sultry glance, daring you to come closer and unravel my secrets."},
  {"option": 2, "text": "My curves catch the light, whispering temptations as I lounge seductively, waiting for your gaze."},
  {"option": 3, "text": "In the heat of the night, my playful touch invites you to explore every inch of this fantasy."},
  {"option": 4, "text": "Soft whispers and a mischievous smile—join me in this steamy moment where desires ignite."},
  {"option": 5, "text": "Basking in the glow of desire, I tempt you with every move, promising a night of passion."}
]`
    } else {
      prompt = `Generate 5 creative and engaging Reddit post captions for adult content, with a strong emphasis on tailoring the style based on the content type.

Key details:
- Physical features/niche: ${physicalFeatures || "not specified"}
- Gender: ${gender}
- Subreddit name: ${subredditName || "not specified"}
- Subreddit type: ${subredditType || "not specified"}
- Visual context: ${visualContext || "not specified"}
- Content type: ${contentType || "picture"} (CRUCIALLY tailor captions as follows: 
  - 'picture': Focus on a single vivid image (e.g., "This sultry pose in silk captures every curve perfectly").
  - 'picture set': Highlight a sequence or variety (e.g., "Watch my curves unfold across these steamy shots").
  - 'GIF/short video': Emphasize motion or progression (e.g., "See my teasing dance unfold in this flickering clip").)
- Caption mood: ${captionMood || "seductive"}
- Rules to follow: ${rules || "none"}
- Creative style: ${creativeStyle || "not specified"}
- Explicitness level: ${degenScale === 1 ? "suggestive" : degenScale === 2 ? "direct" : "explicit"}

Generate 5 distinct caption options that are seductive, match the mood and explicitness level, are appropriate for the specified subreddit type, follow the creative style if specified, and are 150–200 characters long. The content type's style must be the primary influence on each caption. 
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

    let captions = null;

    try {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        throw new Error("AI is not set in environment variables")
      }

      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      })

      const response = await openai.chat.completions.create({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      })

      const text = response.choices[0]?.message?.content
      if (text) {
        try {
          captions = JSON.parse(text)
          if (!Array.isArray(captions) || captions.length !== 5 || !captions.every((c: any) => c.option && c.text)) {
            throw new Error("Invalid captions format from API")
          }
        } catch (error) {
          const jsonMatch = text.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            captions = JSON.parse(jsonMatch[0])
            if (!Array.isArray(captions) || captions.length !== 5 || !captions.every((c: any) => c.option && c.text)) {
              throw new Error("Invalid captions format in API fallback parsing")
            }
          }
        }
      }
    } catch (error) {
      console.warn("API failed, falling back to Hugging Face API:", error)
    }

    if (!captions) {
      const huggingFaceApiUrl = "https://router.huggingface.co/novita/v3/openai/chat/completions"
      const huggingFaceHeaders = {
        "Authorization": "Bearer {process.env.AI_API_KEY}",
        "Content-Type": "application/json"
      }

      const huggingFacePayload = {
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "deepseek/deepseek-v3-0324",
        stream: false,
        temperature: 0.7
      }

      try {
        const response = await fetch(huggingFaceApiUrl, {
          method: "POST",
          headers: huggingFaceHeaders,
          body: JSON.stringify(huggingFacePayload)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `API request failed (${response.status})`)
        }

        const data = await response.json()
        const text = data.choices[0]?.message?.content
        if (!text) {
          throw new Error("No content returned from API")
        }

        try {
          captions = JSON.parse(text)
          if (!Array.isArray(captions) || captions.length !== 5 || !captions.every((c: any) => c.option && c.text)) {
            throw new Error("Invalid captions format from API")
          }
        } catch (error) {
          const jsonMatch = text.match(/\[[\s\S]*\]/)
          if (!jsonMatch) {
            throw new Error("Failed to parse captions from API response")
          }
          captions = JSON.parse(jsonMatch[0])
          if (!Array.isArray(captions) || captions.length !== 5 || !captions.every((c: any) => c.option && c.text)) {
            throw new Error("Invalid captions format in API fallback parsing")
          }
        }
      } catch (error) {
        console.error("API failed:", error)
        throw new Error("APIs failed to generate captions")
      }
    }

    return NextResponse.json({ captions })
  } catch (error: any) {
    console.error("Error generating captions:", error)
    return NextResponse.json({ error: error.message || "Failed to generate captions" }, { status: 500 })
  }
}