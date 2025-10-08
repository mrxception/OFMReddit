import { type NextRequest, NextResponse } from "next/server"
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
    const { imageData } = body

    if (!imageData) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables")
    }

    
    const matches = imageData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ error: "Invalid image data format" }, { status: 400 })
    }

    const mimeType = matches[1]
    const base64Data = matches[2]

    const prompt = `Analyze this NSFW adult content image and extract the following information for generating Reddit captions.

IMPORTANT: Use direct, explicit language. Do NOT use clinical terms or euphemisms. Say "pussy" not "genitals", "tits/boobs" not "breasts", "ass" not "buttocks", "dick/cock" not "penis", etc. Be explicit and direct in your descriptions as this is for adult content categorization.

1. **Physical Features/Niche**: Describe the creator's key physical attributes, body type, ethnicity, age range using explicit terms (e.g., "petite Asian girl with small tits", "curvy Latina MILF with big ass", "muscular fitness model", "goth girl with tattoos and pierced nipples")

2. **Gender**: Identify the gender (female, male, or trans)

3. **Visual Context**: Describe the main action, setting, pose, or focus using explicit language (e.g., "showering with tits out", "spreading pussy on bed", "gym selfie showing ass", "topless cosplay", "fingering herself")

4. **Content Type**: Identify if this is a single picture, picture set, or appears to be from a GIF/video

5. **Suggested Subreddit Category**: Based on the content, suggest which category would be most appropriate:
   - "generalist" for broad appeal content
   - "body-specific" if focused on specific body parts (tits, ass, pussy, etc.)
   - "kink-specific" if showing fetish content or specific activities
   - "aesthetic" if showing specific subculture style (goth, cosplay, etc.)

6. **Caption Mood**: Suggest an appropriate mood (e.g., "playful", "confident", "shy", "seductive", "dominant", "slutty")

Respond ONLY with a JSON object in this exact format:
{
  "physicalFeatures": "description here",
  "gender": "female|male|trans",
  "visualContext": "description here",
  "contentType": "picture|picture set|GIF/short video",
  "subredditType": "generalist|body-specific|kink-specific|aesthetic",
  "captionMood": "mood here"
}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE",
            },
          ],
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()

    if (data.promptFeedback?.blockReason) {
      throw new Error(`Content was blocked: ${data.promptFeedback.blockReason}`)
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new Error("No content returned from Gemini API")
    }

    let analysis
    try {
      analysis = JSON.parse(text)
    } catch (error) {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("Failed to parse analysis from AI response")
      }
      analysis = JSON.parse(jsonMatch[0])
    }

    return NextResponse.json({ analysis })
  } catch (error: any) {
    console.error("Error analyzing image:", error)
    return NextResponse.json({ error: error.message || "Failed to analyze image" }, { status: 500 })
  }
}
