import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { query } from "@/lib/db"

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

    const clickbaitStyle = isInteractive ? "y" : "n"

    const promptResult = await query(
      "SELECT prompt_text FROM prompts WHERE name = ? ORDER BY created_at DESC LIMIT 1",
      ["caption_generator"],
    )

    if (!promptResult || promptResult.length === 0) {
      throw new Error("Caption generator prompt not found in database")
    }

    const basePrompt = promptResult[0].prompt_text

    const documentsResult = await query(
      `SELECT d.filename, d.cloudinary_url, d.file_type 
       FROM documents d 
       JOIN prompts p ON d.prompt_id = p.id 
       WHERE p.name = ? 
       ORDER BY d.created_at DESC`,
      ["caption_generator"],
    )

    const userInputSection = `
# User Input Data
- Physical Features/Niche: ${physicalFeatures || "not specified"}
- Gender: ${gender || "female"}
- Subreddit Name: ${subredditName || "not specified"}
- Subreddit Type/Category: ${subredditType || "not specified"}
- Visual Context: ${visualContext || "not specified"}
- Content Type: ${contentType || "picture"}
- Caption Mood: ${captionMood || "seductive"}
- Creative Style: ${creativeStyle || "not specified"}
- Degen Scale: ${degenScale} (1=suggestive, 2=direct, 3=explicit, 4=very explicit)
- Clickbait Style: ${clickbaitStyle} (y=questions allowed with VALID formats, n=declarative only)
- Subreddit Rules: ${rules || "none specified"}
`

    const jsonFormatOverride = `

# CRITICAL OUTPUT FORMAT OVERRIDE (HIGHEST PRIORITY)
**ATTENTION: This instruction OVERRIDES any other output format instructions in the prompt above.**

You MUST return your response as a valid JSON array with EXACTLY 3 caption objects. Do NOT use XML, markdown, or any other format.

**Required JSON Structure:**
\`\`\`json
[
  {
    "option": "Option 1: [Brief Label]",
    "text": "[The actual caption text]"
  },
  {
    "option": "Option 2: [Brief Label]",
    "text": "[The actual caption text]"
  },
  {
    "option": "Option 3: [Brief Label]",
    "text": "[The actual caption text]"
  }
]
\`\`\`

**MANDATORY RULES:**
1. Return ONLY the JSON array - no additional text, explanations, or markdown code blocks
2. Each object MUST have exactly two fields: "option" and "text"
3. The array MUST contain exactly 3 objects
4. All strings must be properly escaped for JSON
5. Do NOT wrap the JSON in \`\`\`json or any other markers

**Example of correct output:**
[{"option":"Option 1: Niche Fantasy","text":"Your caption here"},{"option":"Option 2: Alt Fantasy","text":"Your caption here"},{"option":"Option 3: Grounded","text":"Your caption here"}]

Generate the 3 captions following all the rules from the prompt above, but return them in this exact JSON format.
`

    const fullPrompt = basePrompt + "\n\n" + userInputSection + "\n\n" + jsonFormatOverride

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables")
    }

    const parts: any[] = [{ text: fullPrompt }]

    if (documentsResult && documentsResult.length > 0) {
      for (const doc of documentsResult) {
        
        const docResponse = await fetch(doc.cloudinary_url)
        if (docResponse.ok) {
          const docBuffer = await docResponse.arrayBuffer()
          const base64Doc = Buffer.from(docBuffer).toString("base64")

          parts.push({
            inline_data: {
              mime_type: doc.file_type,
              data: base64Doc,
            },
          })
        }
      }
    }

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
              parts: parts,
            },
          ],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 2048,
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

    let captions
    try {
      captions = JSON.parse(text)
      if (!Array.isArray(captions) || captions.length !== 3 || !captions.every((c: any) => c.option && c.text)) {
        throw new Error("Invalid captions format")
      }
    } catch (error) {
      console.log("Failed to parse as pure JSON, attempting to extract JSON from text:", text.substring(0, 200))

      const jsonMatch = text.match(/\[\s*\{[\s\S]*?\}\s*\]/)
      if (!jsonMatch) {
        console.error("No JSON array found in response:", text)
        throw new Error(`Failed to parse captions from AI response. Response started with: ${text.substring(0, 100)}`)
      }

      try {
        captions = JSON.parse(jsonMatch[0])
        if (!Array.isArray(captions) || captions.length !== 3 || !captions.every((c: any) => c.option && c.text)) {
          throw new Error("Invalid captions format in fallback parsing")
        }
      } catch (parseError) {
        console.error("Failed to parse extracted JSON:", jsonMatch[0])
        throw new Error("Failed to parse captions from AI response - invalid JSON structure")
      }
    }

    return NextResponse.json({ captions })
  } catch (error: any) {
    console.error("Error generating captions:", error)
    return NextResponse.json({ error: error.message || "Failed to generate captions" }, { status: 500 })
  }
}
